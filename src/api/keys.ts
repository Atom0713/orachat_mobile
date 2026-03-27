import { getBaseUrl } from "./config";

export type PublicKeyBundle = {
  identity_key_b64: string;
  signed_prekey_public_b64: string;
  signed_prekey_id: number;
};

export async function putPublicKeyBundle(
  userId: string,
  bundle: PublicKeyBundle,
  baseUrl?: string
): Promise<void> {
  const url = `${getBaseUrl(baseUrl)}/keys/${encodeURIComponent(userId)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bundle),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`PUT keys failed: HTTP ${res.status}${text ? `: ${text}` : ""}`);
  }
}

export async function getPublicKeyBundle(
  userId: string,
  baseUrl?: string
): Promise<PublicKeyBundle | null> {
  const url = `${getBaseUrl(baseUrl)}/keys/${encodeURIComponent(userId)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`GET keys failed: HTTP ${res.status}${text ? `: ${text}` : ""}`);
  }
  return (await res.json()) as PublicKeyBundle;
}
