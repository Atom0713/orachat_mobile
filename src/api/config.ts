export function getBaseUrl(baseUrl?: string): string {
  const raw =
    baseUrl ??
    process.env.EXPO_PUBLIC_ORACHAT_API_URL ??
    "http://10.0.2.2:8000/";
  return raw.replace(/\/+$/, "");
}
