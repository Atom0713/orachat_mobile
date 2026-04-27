import { getSharedDb } from "./datastore";

export type Conversation = {
  id: number;
  peer_id: string;
  display_name: string | null;
  created_at: string; // ISO 8601 timestamp
};

export type ConversationWithLastMessage = Conversation & {
  lastMessageText: string | null;
  lastMessageAt: string | null; // ISO 8601 timestamp
  hasUnread: boolean;
};

/**
 * Get existing conversation by peer_id or insert a new row and return it.
 */
export async function getOrCreateConversation(peerId: string): Promise<Conversation> {
  const db = await getSharedDb();
  const existing = await db.getFirstAsync<Conversation>(
    "SELECT id, peer_id, display_name, created_at FROM conversations WHERE peer_id = ? LIMIT 1",
    peerId
  );
  if (existing) return existing;
  const created_at = new Date().toISOString();
  const result = await db.runAsync(
    "INSERT INTO conversations (peer_id, display_name, created_at) VALUES (?, ?, ?)",
    peerId,
    null,
    created_at
  );
  const id = result.lastInsertRowId;
  if (typeof id !== "number") throw new Error("[conversationStore] expected number id");
  return { id, peer_id: peerId, display_name: null, created_at };
}

/**
 * Update display_name for a conversation (by id or by peer_id).
 */
export async function setConversationDisplayName(
  conversationIdOrPeerId: number | string,
  displayName: string | null
): Promise<void> {
  const db = await getSharedDb();
  if (typeof conversationIdOrPeerId === "number") {
    await db.runAsync(
      "UPDATE conversations SET display_name = ? WHERE id = ?",
      displayName,
      conversationIdOrPeerId
    );
  } else {
    await db.runAsync(
      "UPDATE conversations SET display_name = ? WHERE peer_id = ?",
      displayName,
      conversationIdOrPeerId
    );
  }
}

/**
 * List all conversations with last message text and time (from messages table).
 * Sorted by last message time descending, then by created_at descending.
 */
export async function getConversationsWithLastMessage(): Promise<
  ConversationWithLastMessage[]
> {
  const db = await getSharedDb();
  const rows = await db.getAllAsync<{
    id: number;
    peer_id: string;
    display_name: string | null;
    created_at: string;
    last_text: string | null;
    last_created_at: string | null;
    has_unread: number;
  }>(`
    SELECT c.id, c.peer_id, c.display_name, c.created_at,
           (SELECT text FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_text,
           (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_created_at,
           (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND unread = 1) AS has_unread
    FROM conversations c
    ORDER BY COALESCE((SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1), c.created_at) DESC, c.id DESC
  `);
  return rows.map((r) => ({
    id: r.id,
    peer_id: r.peer_id,
    display_name: r.display_name,
    created_at: r.created_at,
    lastMessageText: r.last_text,
    lastMessageAt: r.last_created_at,
    hasUnread: (r.has_unread ?? 0) > 0,
  }));
}
