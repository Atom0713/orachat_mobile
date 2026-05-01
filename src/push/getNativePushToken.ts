import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type NativePushToken = {
  data: string;
  type: "ios" | "android";
};

export async function getNativePushToken(): Promise<NativePushToken | null> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    return null;
  }

  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  try {
    const { data, type } = await Notifications.getDevicePushTokenAsync();
    if (!data || typeof data !== "string") return null;
    if (type !== "ios" && type !== "android") return null;
    return { data, type };
  } catch {
    return null;
  }
}
