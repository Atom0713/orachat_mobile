import React from "react";
import { database } from "./datastore";
import { pollInboxAsUnread } from "./transport";

/**
 * Poll inbox while on the chats page. New messages are appended to the store with unread: true.
 */
export function useInboxPolling(senderId: string | null, intervalMs: number) {
  React.useEffect(() => {
    if (!senderId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const tick = async () => {
      try {
        const newMessages = await pollInboxAsUnread({ senderId });
        if (cancelled) return;
        if (newMessages.length > 0) {
          database.append(newMessages);
        }
      } catch (err) {
        if (!cancelled) console.error("[chat] inbox poll failed", err);
      }
    };

    void tick();
    timer = setInterval(() => void tick(), intervalMs);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [senderId, intervalMs]);
}
