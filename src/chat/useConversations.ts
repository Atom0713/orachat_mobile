import React from "react";
import { getConversationsWithLastMessage } from "./conversationStore";
import { useMessages } from "./inMemoryMessageStore";
import type { ConversationWithLastMessage } from "./conversationStore";

/**
 * Returns list of conversations with last message, sorted by last activity.
 * Refetches when the message store updates.
 */
export function useConversations(): ConversationWithLastMessage[] {
  const messages = useMessages();
  const [conversations, setConversations] = React.useState<ConversationWithLastMessage[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    getConversationsWithLastMessage()
      .then((list) => {
        if (!cancelled) setConversations(list);
      })
      .catch((err) => {
        if (!cancelled) console.warn("[useConversations] failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [messages]);

  return conversations;
}
