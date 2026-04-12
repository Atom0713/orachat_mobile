import * as SQLite from "expo-sqlite";
import { useSyncExternalStore } from "react";
import type { ChatMessage } from "./types";

type Listener = () => void;

const listeners = new Set<Listener>();
let messages: ChatMessage[] = [];

const SCHEMA_VERSION = 7;
const DB_NAME = "orachat.db";

let db: SQLite.SQLiteDatabase | null = null;
const dbReady = initDbIfNeeded();
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
    CREATE TABLE messages (
      id TEXT PRIMARY KEY NOT NULL,
      text TEXT NOT NULL,
      created_at TEXT NOT NULL,
      direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
      conversation_id INTEGER NOT NULL,
      unread INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS messages_created_at ON messages(created_at);
    CREATE INDEX IF NOT EXISTS messages_conversation_id ON messages(conversation_id);
  `);

  await database.execAsync(`
    CREATE TABLE conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      peer_id TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT NOT NULL
    );
  `);
  await database.runAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT
    );
  `);
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

export const inMemoryMessageStore = {
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
    inMemoryMessageStore.subscribe,
    inMemoryMessageStore.getSnapshot,
    inMemoryMessageStore.getSnapshot
  );
}
