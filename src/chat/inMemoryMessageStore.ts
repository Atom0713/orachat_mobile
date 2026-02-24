import { useSyncExternalStore } from "react";
import type { ChatMessage } from "./types";

type Listener = () => void;

const listeners = new Set<Listener>();
let messages: ChatMessage[] = [];

function emit() {
  for (const l of listeners) l();
}

export const inMemoryMessageStore = {
  getSnapshot(): ChatMessage[] {
    return messages;
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  seedIfEmpty(seed: ChatMessage[]) {
    if (messages.length > 0) return;
    messages = seed.slice().sort((a, b) => a.createdAtMs - b.createdAtMs);
    emit();
  },
  append(newMessages: ChatMessage[]) {
    if (newMessages.length === 0) return;
    const existing = new Set(messages.map((m) => m.id));
    const deduped = newMessages.filter((m) => !existing.has(m.id));
    if (deduped.length === 0) return;
    messages = messages.concat(deduped).sort((a, b) => a.createdAtMs - b.createdAtMs);
    emit();
  },
};

export function useMessages(): ChatMessage[] {
  return useSyncExternalStore(
    inMemoryMessageStore.subscribe,
    inMemoryMessageStore.getSnapshot,
    inMemoryMessageStore.getSnapshot
  );
}

