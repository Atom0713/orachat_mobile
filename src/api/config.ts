import { Platform } from "react-native";

const devDefaultBaseUrl = Platform.select({
  ios: "http://localhost:8000/",
  android: "http://10.0.2.2:8000/",
  default: "http://10.0.2.2:8000/",
})!;

export function getBaseUrl(baseUrl?: string): string {
  const raw =
    baseUrl ??
    process.env.EXPO_PUBLIC_ORACHAT_API_URL ??
    devDefaultBaseUrl;
  return raw.replace(/\/+$/, "");
}
