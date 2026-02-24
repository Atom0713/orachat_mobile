export type ChatMessage = {
  id: string;
  text: string;
  createdAtMs: number;
  direction: "in" | "out";
};

export type PollOptions = {
  sinceCreatedAtMs?: number;
  limit?: number;
};

export type ChatTransport = {
  sendMessage: (text: string) => Promise<void>;
  poll: (options?: PollOptions) => Promise<ChatMessage[]>;
};

