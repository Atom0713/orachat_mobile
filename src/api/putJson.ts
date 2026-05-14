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
 * PUT JSON and parse response. Surfaces FastAPI `detail` when present.
 */
export async function putJson<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
        method: "PUT",
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => "");
        const detail = parseFastApiDetail(text);
        const message =
            detail ?? `HTTP ${res.status} ${res.statusText}${text && !detail ? `: ${text}` : ""}`;
        throw new Error(message);
    }

    return (await res.json()) as T;
}
