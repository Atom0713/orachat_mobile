---
name: orachat-schema
description: General Orachat mobile app context (stack, layout, env, UI), message schema, ChatTransport contract, API endpoints, and SQLite persistence. Use for onboarding, chat features, encrypted storage, new transports, or modifying the message flow.
---

# Orachat — General App Context & Schema

## Project overview

- **Orachat mobile**: Messenger app for iOS & Android (portfolio / friends & family).
- **Entry**: `expo-router/entry`; routes live under `app/` with file-based routing (e.g. `app/index.tsx`, `app/user-search.tsx`).

## Project layout

| Path | Purpose |
|------|---------|
| `app/` | Screens and layout. `_layout.tsx` = root Stack, hydrates message store on mount. `index.tsx` = main chat; `user-search.tsx` = find users. |
| `src/chat/` | Chat domain: `types.ts`, `transport.ts`, `inMemoryMessageStore.ts`, `useChatPolling.ts`. |
| `src/api/` | API helpers: `config.ts` (base URL), `users.ts` (user search). |

## Environment

Run examples:  
`EXPO_PUBLIC_RECIPIENT=bob EXPO_PUBLIC_USERNAME=alice EXPO_PUBLIC_ORACHAT_API_URL="http://localhost:8000" npx expo start -c` (iOS); for Android use `http://10.0.2.2:8000`.

## UI & navigation

- **Navigation**: Stack only (no tabs in code). Header: blue `#0B5FFF`, white title; content background `#F5FAFF`. From chat, header right button pushes `/user-search`.
- **Styling**: React Native `StyleSheet` in each screen; shared palette: primary `#0B5FFF`, text `#102A43`, muted `#6B7A90`, borders `rgba(11, 95, 255, 0.18)`.
- **Chat screen**: `SafeAreaView` + `KeyboardAvoidingView`, inverted `FlatList`, bottom composer; polling every 1200 ms via `useChatPolling(transport, 1200)`.

## Conventions

- One conversation per app: sender/recipient from env; no in-app conversation switcher yet.
- Messages: in-memory store + SQLite; no WebSockets (polling only).
- User search: screen only; selecting a user does not yet change recipient (future work).
---

# Orachat Schema & Transport Contract

## Core Types

### ChatMessage

```typescript
type ChatMessage = {
  id: string;
  text: string;
  createdAtMs: number;
  direction: "in" | "out";
};
```

- `id`: Unique message ID (from backend or `local-${Date.now()}` for optimistic sends)
- `text`: Plaintext content (will hold ciphertext when encrypted)
- `createdAtMs`: Unix timestamp in milliseconds
- `direction`: `"in"` = received, `"out"` = sent

### ChatTransport

```typescript
type ChatTransport = {
  sendMessage: (text: string) => Promise<void>;
  poll: (options?: PollOptions) => Promise<ChatMessage[]>;
};

type PollOptions = {
  sinceCreatedAtMs?: number;
  limit?: number;
};
```

- `sendMessage`: Sends text; transport appends to `inMemoryMessageStore` on success (or optimistic append on failure)
- `poll`: Fetches new messages since `sinceCreatedAtMs`, returns up to `limit` (default 50)

## Transport Config

```typescript
type OrachatTransportConfig = {
  baseUrl?: string;
  senderId?: string;
  recipientId?: string;
};
```

- `baseUrl`: API root (default: `EXPO_PUBLIC_ORACHAT_API_URL` or `http://10.0.2.2:8000`)
- `senderId` / `recipientId`: Override env vars `EXPO_PUBLIC_USERNAME` and `EXPO_PUBLIC_RECIPIENT`

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/messages/send` | Send message. Body: `{ sender_id, recipient_id, content }`. Returns created message with `id`, `content`, `created_at` (ISO) |
| GET | `/messages/inbox?user_id={id}` | Fetch inbox for user. Returns array of messages |
| POST | `/messages/ack/{message_id}` | Acknowledge message (delete from inbox) |
| GET | `/users/search?q={query}` | Search users by username. Returns `SearchUser[]` |

### OrachatApiMessage (backend shape)

```typescript
type OrachatApiMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string; // ISO datetime
};
```

## Message Store

- **Location**: `src/chat/inMemoryMessageStore.ts`
- **Pattern**: In-memory cache + SQLite persistence, `useSyncExternalStore` for React
- **Exports**: `inMemoryMessageStore`, `useMessages()`, `ensureMessagesHydrated()`

### SQLite Schema

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out'))
);
CREATE INDEX messages_created_at_ms ON messages(created_at_ms);
```

- **DB**: `orachat.db`, WAL mode
- **Migrations**: `PRAGMA user_version`; bump `SCHEMA_VERSION` when changing schema
- **Persistence**: `INSERT OR IGNORE` on append; hydrate on startup

### Store API

- `append(newMessages)`: Dedupes by `id`, sorts by `createdAtMs`, persists, notifies subscribers
- `getSnapshot()` / `subscribe()`: For `useSyncExternalStore`

## Polling Flow

`useChatPolling(transport, intervalMs)`:

1. Polls `transport.poll({ sinceCreatedAtMs: lastSeen })` on interval
2. On new messages: updates `lastSeenRef`, appends to store
3. Store persists to SQLite and notifies UI

## Extending for Encryption

When adding E2E encryption:

- `ChatMessage.text` can hold ciphertext; add optional `encrypted?: boolean` or separate `ciphertext` field if needed
- Transport layer encrypts before `sendMessage`, decrypts after `poll`
- SQLite schema may need a new column for ciphertext vs plaintext; use migration (bump `SCHEMA_VERSION`)
