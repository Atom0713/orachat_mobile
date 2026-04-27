import { getBaseUrl } from "../api/config";
import { getUserById } from "../api/users";
import { decryptIncomingMessage, encryptOutgoingMessage } from "../crypto/e2e";
import { getOrCreateConversation, setConversationDisplayName } from "./conversationStore";
import { database } from "./datastore";
import type { ChatMessage, ChatTransport, PollOptions } from "./types";

type OrachatApiMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  ciphertext: string;
  created_at: string; // ISO datetime
};

type OrachatSendMessageRequest = {
  sender_id: string;
  recipient_id: string;
  ciphertext: string;
};

export type OrachatTransportConfig = {
  baseUrl?: string;
  senderId: string;
  recipientId: string;
  conversationId: number;
};

function normalizeCreatedAt(iso: string): string {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : new Date().toISOString();
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  return (await res.json()) as T;
}

async function decryptText(
  ciphertext: string,
  peerSenderId: string,
  localUserId: string,
  baseUrl?: string
): Promise<string> {
  try {
    return await decryptIncomingMessage(ciphertext, peerSenderId, localUserId, baseUrl);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "decrypt error";
    return `[Couldn't decrypt: ${msg}]`;
  }
}

/**
 * Polling transport backed by ORACHAT FastAPI endpoints:
 * - POST `/messages/send`
 * - GET `/messages/inbox?user_id=...`
 * - POST `/messages/ack/{message_id}`
 */
export function createPollingTransport(config: OrachatTransportConfig): ChatTransport {
  const baseUrl = getBaseUrl(config.baseUrl);
  const senderId = config.senderId;
  const recipientId = config.recipientId;
  const conversationId = config.conversationId;

  return {
    async sendMessage(text: string) {
      let ciphertext: string;
      try {
        ciphertext = await encryptOutgoingMessage(text, senderId, recipientId, baseUrl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "encrypt failed";
        console.error("[chat] encrypt failed", e);
        throw new Error(msg);
      }

      const body: OrachatSendMessageRequest = {
        sender_id: senderId,
        recipient_id: recipientId,
        ciphertext,
      };

      try {
        const created = await fetchJson<OrachatApiMessage>(`${baseUrl}/messages/send`, {
          method: "POST",
          body: JSON.stringify(body),
        });

        const outgoing: ChatMessage = {
          id: created.id,
          text,
          createdAt: normalizeCreatedAt(created.created_at),
          direction: "out",
          conversationId,
          unread: false,
        };
        database.append([outgoing]);
      } catch (err) {
        console.error("[chat] send request failed", err);
        database.append([
          {
            id: `local-${Date.now()}`,
            text,
            createdAt: new Date().toISOString(),
            direction: "out",
            conversationId,
            unread: false,
          },
        ]);
        throw err;
      }
    },

    async poll(options?: PollOptions) {
      const since = options?.sinceCreatedAt ?? "";
      const limit = options?.limit ?? 50;

      const inbox = await fetchJson<OrachatApiMessage[]>(
        `${baseUrl}/messages/inbox?user_id=${encodeURIComponent(senderId)}`
      );

      const withConversations = await Promise.all(
        inbox
          .filter((m) => m.sender_id != null && m.sender_id !== "")
          .map(async (m) => {
            const peerId = m.sender_id as string;
            const conv = await getOrCreateConversation(peerId);
            if (conv.display_name == null) {
              try {
                const user = await getUserById(peerId);
                if (user) {
                  const name = user.display_name ?? user.username ?? peerId;
                  await setConversationDisplayName(conv.id, name);
                }
              } catch {
                // ignore
              }
            }
            const plain = await decryptText(m.ciphertext, peerId, senderId, baseUrl);
            return {
              id: m.id,
              text: plain,
              createdAt: normalizeCreatedAt(m.created_at),
              direction: "in" as const,
              conversationId: conv.id,
              unread: false,
            };
          })
      );

      const received: ChatMessage[] = withConversations
        .filter((m) => m.createdAt > since)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .slice(0, limit);

      if (received.length === 0) return [];

      await Promise.allSettled(
        received.map((m) => fetch(`${baseUrl}/messages/ack/${encodeURIComponent(m.id)}`, { method: "POST" }))
      );

      return received;
    },
  };
}

/**
 * Fetch inbox for the given user, map to ChatMessage with unread: true, ack on server, and return.
 * Used on the chats page to pull new messages and store them as unread.
 */
export async function pollInboxAsUnread(config: {
  baseUrl?: string;
  senderId: string;
}): Promise<ChatMessage[]> {
  const baseUrl = getBaseUrl(config.baseUrl);
  const senderId = config.senderId;

  const inbox = await fetchJson<OrachatApiMessage[]>(
    `${baseUrl}/messages/inbox?user_id=${encodeURIComponent(senderId)}`
  );

  const withConversations = await Promise.all(
    inbox
      .filter((m) => m.sender_id != null && m.sender_id !== "")
      .map(async (m) => {
        const peerId = m.sender_id as string;
        const conv = await getOrCreateConversation(peerId);
        if (conv.display_name == null) {
          try {
            const user = await getUserById(peerId);
            if (user) {
              const name = user.display_name ?? user.username ?? peerId;
              await setConversationDisplayName(conv.id, name);
            }
          } catch {
            // ignore: e.g. network error
          }
        }
        const plain = await decryptText(m.ciphertext, peerId, senderId, baseUrl);
        return {
          id: m.id,
          text: plain,
          createdAt: normalizeCreatedAt(m.created_at),
          direction: "in" as const,
          conversationId: conv.id,
          unread: true,
        };
      })
  );

  const received = withConversations.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (received.length === 0) return [];

  await Promise.allSettled(
    received.map((m) =>
      fetch(`${baseUrl}/messages/ack/${encodeURIComponent(m.id)}`, {
        method: "POST",
      })
    )
  );

  return received;
}
