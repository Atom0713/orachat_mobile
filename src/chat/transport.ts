import type { ChatMessage, ChatTransport, PollOptions } from "./types";
import { inMemoryMessageStore } from "./inMemoryMessageStore";

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

type PendingInbound = {
  message: ChatMessage;
};

/**
 * Mock transport that demonstrates the shape of a future backend client:
 * - `sendMessage()` would call an API
 * - `poll()` would fetch new messages since a timestamp
 */
export function createPollingTransport(): ChatTransport {
  const inboundQueue: PendingInbound[] = [];

  return {
    async sendMessage(text: string) {
      const now = Date.now();
      const outgoing: ChatMessage = {
        id: `out-${uid()}`,
        text,
        createdAtMs: now,
        direction: "out",
      };

      inMemoryMessageStore.append([outgoing]);

      // Simulate server-side delivery of an inbound message that will be received via polling.
      const inbound: ChatMessage = {
        id: `in-${uid()}`,
        text: `Echo: ${text}`,
        createdAtMs: now + 450,
        direction: "in",
      };
      inboundQueue.push({ message: inbound });
    },

    async poll(options?: PollOptions) {
      const since = options?.sinceCreatedAtMs ?? 0;
      const limit = options?.limit ?? 50;

      const ready = inboundQueue
        .map((x) => x.message)
        .filter((m) => m.createdAtMs > since)
        .sort((a, b) => a.createdAtMs - b.createdAtMs)
        .slice(0, limit);

      if (ready.length === 0) return [];

      const readyIds = new Set(ready.map((m) => m.id));
      for (let i = inboundQueue.length - 1; i >= 0; i--) {
        if (readyIds.has(inboundQueue[i]!.message.id)) inboundQueue.splice(i, 1);
      }

      return ready;
    },
  };
}

