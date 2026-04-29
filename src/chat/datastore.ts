import * as SQLite from "expo-sqlite";
import { useSyncExternalStore } from "react";
import type { ChatMessage } from "./types";

type Listener = () => void;

const listeners = new Set<Listener>();
let messages: ChatMessage[] = [];

const SCHEMA_VERSION = 8;
const DB_NAME = "orachat.db";

let db: SQLite.SQLiteDatabase | null = null;
const dbReady = initDbIfNeeded();

/** Dedupe conversations per peer and enforce one row per peer_id (fixes parallel inbox poll races). */
async function migrateConversationsUniquePeer(database: SQLite.SQLiteDatabase): Promise<void> {
  const dupes = await database.getAllAsync<{ peer_id: string; keep_id: number }>(`
    SELECT peer_id, MIN(id) AS keep_id
    FROM conversations
    GROUP BY peer_id
    HAVING COUNT(*) > 1
  `);
  for (const d of dupes) {
    await database.runAsync(
      `UPDATE messages SET conversation_id = ?
       WHERE conversation_id IN (SELECT id FROM conversations WHERE peer_id = ? AND id != ?)`,
      d.keep_id,
      d.peer_id,
      d.keep_id
    );
    await database.runAsync(
      "DELETE FROM conversations WHERE peer_id = ? AND id != ?",
      d.peer_id,
      d.keep_id
    );
  }
  await database.execAsync(
    "CREATE UNIQUE INDEX IF NOT EXISTS conversations_peer_id_unique ON conversations(peer_id);"
  );
}
const hydrated = dbReady.then(() => hydrateCacheFromDb()).catch((err) => {
  console.warn("[chat] SQLite hydrate failed, using empty cache", err);
});

function emit() {
  for (const l of listeners) l();
}

async function initDbIfNeeded(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  const database = await SQLite.openDatabaseAsync(DB_NAME);
  await database.execAsync("PRAGMA journal_mode = WAL;");
  
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
      conversation_id INTEGER NOT NULL,
      unread INTEGER NOT NULL DEFAULT 1,
      sent INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS messages_conversation_id ON messages(conversation_id);
  `);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peer_id TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS conversation_id ON conversations(id);
  `);

  const versionRow = await database.getFirstAsync<{ user_version: number }>("PRAGMA user_version");
  const userVersion = versionRow?.user_version ?? 0;
  if (userVersion < 8) {
    await migrateConversationsUniquePeer(database);
  }
  await database.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION};`);

  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT
    );
  `);
  db = database;
  return database;
}

type DbRow = {
  id: string;
  text: string;
  created_at: string;
  direction: "in" | "out";
  conversation_id: number;
  unread: number;
};

async function hydrateCacheFromDb(): Promise<void> {
  const database = await dbReady;
  const rows = await database.getAllAsync<DbRow>(
    "SELECT id, text, created_at, direction, conversation_id, unread FROM messages ORDER BY created_at ASC, id ASC"
  );
  messages = rows.map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: r.created_at,
    direction: r.direction,
    conversationId: r.conversation_id,
    unread: r.unread !== 0,
  }));
  emit();
}

function persistMessages(toPersist: ChatMessage[]): void {
  if (toPersist.length === 0) return;
  dbReady
    .then(async (database) => {
      for (const m of toPersist) {
        await database.runAsync(
          "INSERT OR IGNORE INTO messages (id, text, created_at, direction, conversation_id, unread) VALUES (?, ?, ?, ?, ?, ?)",
          m.id,
          m.text,
          m.createdAt,
          m.direction,
          m.conversationId,
          m.unread ? 1 : 0
        );
      }
    })
    .catch((err) => console.warn("[chat] SQLite persist failed", err));
}

export const database = {
  getSnapshot(): ChatMessage[] {
    return messages;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  append(newMessages: ChatMessage[]) {
    if (newMessages.length === 0) return;
    const existing = new Set(messages.map((m) => m.id));
    const deduped = newMessages.filter((m) => !existing.has(m.id));
    if (deduped.length === 0) return;
    messages = messages.concat(deduped).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    emit();
    persistMessages(deduped);
  },
  markConversationAsRead(conversationId: number) {
    const updated = messages.filter((m) => m.conversationId === conversationId && m.unread);
    if (updated.length === 0) return;
    for (const m of updated) m.unread = false;
    // New array reference so useSyncExternalStore subscribers re-render (same ref = skipped).
    messages = messages.slice();
    emit();
    dbReady
      .then((database) =>
        database.runAsync(
          "UPDATE messages SET unread = 0 WHERE conversation_id = ?",
          conversationId
        )
      )
      .catch((err) => console.warn("[chat] markAsRead failed", err));
  },
};

/** Drop cached messages for a conversation after DB deletes; bumps snapshot so list hooks refetch. */
export function evictConversationFromMessageCache(conversationId: number): void {
  const filtered = messages.filter((m) => m.conversationId !== conversationId);
  messages = filtered.length === messages.length ? messages.slice() : filtered;
  emit();
}

/** Call early in app lifecycle so cache is hydrated from DB before first render if possible. */
export function ensureMessagesHydrated(): Promise<void> {
  return hydrated;
}

/** Same DB connection used for messages (already migrated). Use for user table queries so schema is guaranteed. */
export function getSharedDb(): Promise<SQLite.SQLiteDatabase> {
  return dbReady;
}

export function useMessages(): ChatMessage[] {
  return useSyncExternalStore(
    database.subscribe,
    database.getSnapshot,
    database.getSnapshot
  );
}
