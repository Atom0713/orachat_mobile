import { getBaseUrl } from "./config";

export type SearchUser = {
  id: string;
  username?: string;
  display_name?: string;
  [key: string]: unknown;
};

export type RegisterRequest = {
  username: string;
  display_name?: string | null;
};

export type RegisterResponse = {
  id: string;
  username: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
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

async function fetchJsonPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message =
      res.status === 409 ? "Username already taken" : `HTTP ${res.status} ${res.statusText}${text ? `: ${text}` : ""}`;
    throw new Error(message);
  }

  return (await res.json()) as T;
}

/**
 * Register a new user. POST /users/register.
 * Throws on non-2xx (e.g. 409 "Username already taken").
 */
export async function registerUser(body: RegisterRequest): Promise<RegisterResponse> {
  const baseUrl = getBaseUrl();
  return fetchJsonPost<RegisterResponse>(`${baseUrl}/users/register`, body);
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
