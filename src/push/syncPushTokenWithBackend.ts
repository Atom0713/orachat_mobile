import { registerDevicePushToken } from "../api/push";
import { getNativePushToken } from "./getNativePushToken";

export async function syncPushTokenWithBackend(userId: string): Promise<void> {
  const token = await getNativePushToken();
  if (!token) return;
  await registerDevicePushToken(userId, token);
}
