import { getSharedDb } from "../chat/inMemoryMessageStore";

export type LocalUser = {
  id: string;
  username: string;
  display_name: string | null;
};

/**
 * Returns the single local user row, or null if none.
 * Uses the same DB connection as the message store (already migrated).
 */
export async function getLocalUser(): Promise<LocalUser | null> {
  try {
    const db = await getSharedDb();
    const row = await db.getFirstAsync<LocalUser>(
      "SELECT id, username, display_name FROM user LIMIT 1"
    );
    return row ?? null;
  } catch (err) {
    console.warn("[userStore] getLocalUser failed", err);
    return null;
  }
}

/**
 * Stores the local user (insert or replace single row).
 */
export async function setLocalUser(user: LocalUser): Promise<void> {
  const db = await getSharedDb();
  await db.runAsync(
    "INSERT OR REPLACE INTO user (id, username, display_name) VALUES (?, ?, ?)",
    user.id,
    user.username,
    user.display_name
  );
}
