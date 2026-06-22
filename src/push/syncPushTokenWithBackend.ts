import { registerDevicePushToken } from "../api/push";

export async function syncPushTokenWithBackend(userId: string): Promise<void> {
  const token = '';
  if (!token) return;
  await registerDevicePushToken(userId, token);
}
