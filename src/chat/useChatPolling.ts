import React from "react";
import { database } from "./datastore";
import type { ChatTransport } from "./types";

export function useChatPolling(transport: ChatTransport, intervalMs: number) {
  const lastSeenRef = React.useRef<string>("");

  React.useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      try {
        const newMessages = await transport.poll({ sinceCreatedAt: lastSeenRef.current });
        if (cancelled) return;
        if (newMessages.length > 0) {
          const newest = newMessages.reduce((max, m) =>
            m.createdAt > max ? m.createdAt : max
          , newMessages[0].createdAt);
          lastSeenRef.current = newest > lastSeenRef.current ? newest : lastSeenRef.current;
          database.append(newMessages);
        }
      } catch (err) {
        if (!cancelled) console.error("[chat] poll failed", err);
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

