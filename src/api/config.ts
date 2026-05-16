import Constants from "expo-constants";
import { Platform } from "react-native";

const devDefaultBaseUrl = Platform.select({
  ios: "http://localhost:8000/",
  android: "http://10.0.2.2:8000/",
  default: "http://10.0.2.2:8000/",
})!;

function getEnvBaseUrl(): string | undefined {
  return (
    process.env.EXPO_PUBLIC_ORACHAT_API_URL ||
    Constants.expoConfig?.extra?.EXPO_PUBLIC_ORACHAT_API_URL ||
    Constants.manifest?.extra?.EXPO_PUBLIC_ORACHAT_API_URL
  );
}

export function getBaseUrl(baseUrl?: string): string {
  const raw = baseUrl ?? getEnvBaseUrl() ?? devDefaultBaseUrl;
  return raw.replace(/\/+$/, "");
}
