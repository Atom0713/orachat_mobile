function parseFastApiDetail(text: string): string | undefined {
  try {
    const j = JSON.parse(text) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    if (Array.isArray(j.detail) && j.detail.length > 0) {
      const first = j.detail[0] as { msg?: string };
      if (typeof first?.msg === "string") return first.msg;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * POST JSON and parse response. Surfaces FastAPI `detail` when present.
 */
export async function postJson<T>(url: string, body: unknown): Promise<T> {
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
    const detail = parseFastApiDetail(text);
    if (res.status === 409) {
      throw new Error(detail ?? "Username already taken");
    }
    const message =
      detail ?? `HTTP ${res.status} ${res.statusText}${text && !detail ? `: ${text}` : ""}`;
    throw new Error(message);
  }

  return (await res.json()) as T;
}
