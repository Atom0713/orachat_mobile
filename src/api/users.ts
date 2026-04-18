import { getBaseUrl } from "./config";
import { postJson } from "./postJson";

export type SearchUser = {
  id: string;
  username?: string;
  display_name?: string;
  [key: string]: unknown;
};

export type RegisterRequest = {
  username: string;
  display_name?: string | null;
  invite_code: string;
};

export type RegisterResponse = {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  updated_at: string | null;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }

  return (await res.json()) as T;
}

/**
 * Register a new user. POST /users/register.
 * Throws on non-2xx (e.g. 409 "Username already taken").
 */
export async function registerUser(body: RegisterRequest): Promise<RegisterResponse> {
  const baseUrl = getBaseUrl();
  return postJson<RegisterResponse>(`${baseUrl}/users/register`, body);
}

/**
 * Search users by query string.
 * GET /users/search?q=...
 */
export async function searchUsers(query: string): Promise<SearchUser[]> {
  const baseUrl = getBaseUrl();
  const q = encodeURIComponent(query.trim());
  if (!q) return [];
  const url = `${baseUrl}/users/search?q=${q}`;
  return fetchJson<SearchUser[]>(url);
}

/**
 * Fetch user info by id (e.g. for displaying peer in chats when a new conversation is created).
 * GET /users/{userId}. Returns null on 404.
 */
export async function getUserById(userId: string): Promise<SearchUser | null> {
  const baseUrl = getBaseUrl();
  const res = await fetch(`${baseUrl}/users/${encodeURIComponent(userId)}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as SearchUser;
}
