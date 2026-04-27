import { getBaseUrl } from "./config";
import { postJson } from "./postJson";

export type CreateInviteRequest = {
  created_by: string;
};

export type InviteResponse = {
  code: string;
  created_by: string;
  expires_at: string;
  used_by: string | null;
  created_at: string;
};

export async function createInvite(body: CreateInviteRequest): Promise<InviteResponse> {
  const baseUrl = getBaseUrl();
  return postJson<InviteResponse>(`${baseUrl}/invites`, body);
}
