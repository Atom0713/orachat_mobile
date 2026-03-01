export type ChatMessage = {
  id: string;
  text: string;
  createdAtMs: number;
  direction: "in" | "out";
  /** Set for incoming messages (sender of the message). */
  senderId?: string;
};

export type PollOptions = {
  sinceCreatedAtMs?: number;
  limit?: number;
};

export type ChatTransport = {
  sendMessage: (text: string) => Promise<void>;
  poll: (options?: PollOptions) => Promise<ChatMessage[]>;
};

