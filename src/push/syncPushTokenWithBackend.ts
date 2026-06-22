import { Platform } from "react-native";
import { registerDevicePushToken } from "../api/push";

export async function syncPushTokenWithBackend(userId: string): Promise<void> {
  try {
    let tokenData: string | null = null;

    try {
      // Dynamically require to avoid hard dependency if not installed
      const messaging = require('@react-native-firebase/messaging')?.default ?? require('@react-native-firebase/messaging');
      if (!messaging) return;

      // On iOS, register for remote messages
      if (Platform.OS === 'ios' && messaging().registerDeviceForRemoteMessages) {
        try { await messaging().registerDeviceForRemoteMessages(); } catch { }
      }
      try { await messaging().requestPermission?.(); } catch { }

      try {
        tokenData = await messaging().getToken();
      } catch (e) {
        tokenData = null;
      }
    } catch (e) {
      return;
    }

    if (!tokenData) return;
    await registerDevicePushToken(userId, tokenData);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('syncPushTokenWithBackend error:', err);
  }
}

export function startPushTokenRefreshListener(userId: string): () => void {
  try {
    const messaging = require('@react-native-firebase/messaging')?.default ?? require('@react-native-firebase/messaging');
    if (!messaging) return () => { };

    const unsubscribe = messaging().onTokenRefresh(async (newToken: string) => {
      try {
        await registerDevicePushToken(userId, newToken);
      } catch (e) {
        console.error('failed to register refreshed token:', e);
      }
    });

    return unsubscribe;
  } catch (err) {
    console.error('startPushTokenRefreshListener error:', err);
    return () => { };
  }
}
