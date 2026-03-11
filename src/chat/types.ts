export type ChatMessage = {
  id: string;
  text: string;
  createdAt: string; // ISO 8601 timestamp
  direction: "in" | "out";
  conversationId: number;
  /** true = unread, false = read. Default true for incoming when fetched on chats page. */
  unread: boolean;
};

export type PollOptions = {
  sinceCreatedAt?: string; // ISO 8601 timestamp
  limit?: number;
};

export type ChatTransport = {
  sendMessage: (text: string) => Promise<void>;
  poll: (options?: PollOptions) => Promise<ChatMessage[]>;
};

