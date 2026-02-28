import { getBaseUrl } from "./config";

export type SearchUser = {
  id: string;
  username?: string;
  display_name?: string;
  [key: string]: unknown;
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
