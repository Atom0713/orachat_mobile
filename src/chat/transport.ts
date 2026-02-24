import type { ChatMessage, ChatTransport, PollOptions } from "./types";
import { inMemoryMessageStore } from "./inMemoryMessageStore";

type OrachatApiMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string; // ISO datetime
};

type OrachatSendMessageRequest = {
  sender_id: string;
  recipient_id: string;
  content: string;
};

export type OrachatTransportConfig = {
  baseUrl?: string;
  senderId?: string;
  recipientId?: string;
};

function getBaseUrl(baseUrl?: string) {
  const raw =
    baseUrl ??
    // Expo supports EXPO_PUBLIC_ env vars at runtime
    process.env.EXPO_PUBLIC_ORACHAT_API_URL ??
    "http://10.0.2.2:8000/";
  return raw.replace(/\/+$/, "");
}

function parseCreatedAtMs(iso: string) {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : Date.now();
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

  // FastAPI returns JSON for successful routes used here
  return (await res.json()) as T;
}

/**
 * Polling transport backed by ORACHAT FastAPI endpoints:
 * - POST `/messages/send`
 * - GET `/messages/inbox?user_id=...`
 * - POST `/messages/ack/{message_id}`
 */
export function createPollingTransport(config: OrachatTransportConfig = {}): ChatTransport {
  const baseUrl = getBaseUrl(config.baseUrl);
  const senderId = config.senderId ?? "bob";
  const recipientId = config.recipientId ?? "server";

  return {
    async sendMessage(text: string) {
      const body: OrachatSendMessageRequest = {
        sender_id: senderId,
        recipient_id: recipientId,
        content: text,
      };

      try {
        console.log("[chat] POST", `${baseUrl}/messages/send`);
        const created = await fetchJson<OrachatApiMessage>(`${baseUrl}/messages/send`, {
          method: "POST",
          body: JSON.stringify(body),
        });

        const outgoing: ChatMessage = {
          id: created.id,
          text: created.content,
          createdAtMs: parseCreatedAtMs(created.created_at),
          direction: "out",
        };
        inMemoryMessageStore.append([outgoing]);
      } catch (err) {
        console.error("[chat] send request failed", err);
        // Fall back to optimistic local append if the backend is unreachable.
        inMemoryMessageStore.append([
          { id: `local-${Date.now()}`, text, createdAtMs: Date.now(), direction: "out" },
        ]);
        throw err;
      }
    },

    async poll(options?: PollOptions) {
      const since = options?.sinceCreatedAtMs ?? 0;
      const limit = options?.limit ?? 50;

      const inbox = await fetchJson<OrachatApiMessage[]>(
        `${baseUrl}/messages/inbox?user_id=${encodeURIComponent(senderId)}`
      );

      const received = inbox
        .map<ChatMessage>((m) => ({
          id: m.id,
          text: m.content,
          createdAtMs: parseCreatedAtMs(m.created_at),
          direction: "in",
        }))
        .filter((m) => m.createdAtMs > since)
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
        .slice(0, limit);

      if (received.length === 0) return [];

      // Ack only messages we're returning so we don't drop anything unintentionally.
      await Promise.allSettled(
        received.map((m) => fetch(`${baseUrl}/messages/ack/${encodeURIComponent(m.id)}`, { method: "POST" }))
      );

      return received;
    },
  };
}

