import { getBaseUrl } from "./config";
import { putJson } from "./putJson";

export type DevicePushTokenPayload = {
  data: string;
  type: "ios" | "android";
};

export async function registerDevicePushToken(
  userId: string,
  token: DevicePushTokenPayload
): Promise<void> {
  const baseUrl = getBaseUrl();
  await putJson<unknown>(`${baseUrl}/push/device-token`, {
    user_id: userId,
    data: token.data,
    type: token.type,
  });
}
