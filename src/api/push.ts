import { getBaseUrl } from "./config";
import { putJson } from "./putJson";

export async function registerDevicePushToken(
  userId: string,
  token: string
): Promise<void> {
  const baseUrl = getBaseUrl();
  await putJson<unknown>(`${baseUrl}/push/device-token`, {
    user_id: userId,
    data: token,
  });
}
