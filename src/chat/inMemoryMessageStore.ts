import { useSyncExternalStore } from "react";
import * as SQLite from "expo-sqlite";
import type { ChatMessage } from "./types";

type Listener = () => void;

const listeners = new Set<Listener>();
let messages: ChatMessage[] = [];

const SCHEMA_VERSION = 3;
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
  const versionResult = await database.getFirstAsync<{ user_version: number }>(
    "PRAGMA user_version"
  );
  const version = versionResult?.user_version ?? 0;
  if (version < SCHEMA_VERSION) {
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY NOT NULL,
        text TEXT NOT NULL,
        created_at_ms INTEGER NOT NULL,
        direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
        sender_id TEXT
      );
      CREATE INDEX IF NOT EXISTS messages_created_at_ms ON messages(created_at_ms);
    `);
    await database.runAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  }
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL,
      display_name TEXT
    );
  `);
  db = database;
  return db;
}

type DbRow = {
  id: string;
  text: string;
  created_at_ms: number;
  direction: "in" | "out";
  sender_id: string | null;
};

async function hydrateCacheFromDb(): Promise<void> {
  const database = await dbReady;
  const rows = await database.getAllAsync<DbRow>(
    "SELECT id, text, created_at_ms, direction, sender_id FROM messages ORDER BY created_at_ms ASC, id ASC"
  );
  messages = rows.map((r) => ({
    id: r.id,
    text: r.text,
    createdAtMs: r.created_at_ms,
    direction: r.direction,
    ...(r.sender_id != null ? { senderId: r.sender_id } : {}),
  }));
  emit();
}

function persistMessages(toPersist: ChatMessage[]): void {
  if (toPersist.length === 0) return;
  dbReady
    .then(async (database) => {
      for (const m of toPersist) {
        await database.runAsync(
          "INSERT OR IGNORE INTO messages (id, text, created_at_ms, direction, sender_id) VALUES (?, ?, ?, ?, ?)",
          m.id,
          m.text,
          m.createdAtMs,
          m.direction,
          m.senderId ?? null
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
    messages = messages.concat(deduped).sort((a, b) => a.createdAtMs - b.createdAtMs);
    emit();
    persistMessages(deduped);
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
