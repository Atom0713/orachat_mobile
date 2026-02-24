import React from "react";
import type { ChatTransport } from "./types";
import { inMemoryMessageStore } from "./inMemoryMessageStore";

export function useChatPolling(transport: ChatTransport, intervalMs: number) {
  const lastSeenRef = React.useRef<number>(0);

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      try {
        const newMessages = await transport.poll({ sinceCreatedAtMs: lastSeenRef.current });
        if (cancelled) return;
        if (newMessages.length > 0) {
          const newest = Math.max(...newMessages.map((m) => m.createdAtMs));
          lastSeenRef.current = Math.max(lastSeenRef.current, newest);
          inMemoryMessageStore.append(newMessages);
        }
      } catch {
        // Ignore errors for now; real transport can surface them later.
      }
    };

    void tick();
    timer = setInterval(() => void tick(), intervalMs);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [transport, intervalMs]);
}

