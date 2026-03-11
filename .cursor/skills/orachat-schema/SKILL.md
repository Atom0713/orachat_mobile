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
| `app/` | Screens and layout. `_layout.tsx` = root Stack, auth guard (redirect to `/register` when no user), hydrates message store. `index.tsx` = main chat; `register.tsx` = username-only registration; `user-search.tsx` = find users. |
| `src/chat/` | Chat domain: `types.ts`, `transport.ts`, `inMemoryMessageStore.ts`, `useChatPolling.ts`. |
| `src/api/` | API helpers: `config.ts` (base URL), `users.ts` (user search, register). |
| `src/user/` | User store: `userStore.ts` — `getLocalUser()`, `setLocalUser()` (SQLite `user` table). |

## Environment

Run examples:  
`EXPO_PUBLIC_ORACHAT_API_URL="http://localhost:8000" npx expo start -c` (iOS); for Android use `http://10.0.2.2:8000`.

## UI & navigation

- **Navigation**: Stack only (no tabs in code). Header: blue `#0B5FFF`, white title; content background `#F5FAFF`. From chat, header right button pushes `/user-search`.
- **Styling**: React Native `StyleSheet` in each screen; shared palette: primary `#0B5FFF`, text `#102A43`, muted `#6B7A90`, borders `rgba(11, 95, 255, 0.18)`.
- **Chat screen**: `SafeAreaView` + `KeyboardAvoidingView`, inverted `FlatList`, bottom composer; polling every 1200 ms via `useChatPolling(transport, 1200)`.

## Conventions

- One conversation per app. **Sender**: after registration, `senderId` comes from local user store (`user.id`); transport is created with `createPollingTransport({ senderId: user.id })`. No env required for sender when registered. Recipient from env or future picker.
- Messages: in-memory store + SQLite; no WebSockets (polling only).
- User search: screen only; selecting a user does not yet change recipient (future work).
- **Registration**: username only; display_name derived from username (before normalize); stored in SQLite and propagated via POST `/users/register` for discoverability. In-app display uses **display_name**.
---

# Orachat Schema & Transport Contract

## Core Types

### ChatMessage

```typescript
type ChatMessage = {
  id: string;
  text: string;
  createdAt: string; // ISO 8601 timestamp
  direction: "in" | "out";
};
```

- `id`: Unique message ID (from backend or `local-${Date.now()}` for optimistic sends)
- `text`: Plaintext content (will hold ciphertext when encrypted)
- `createdAt`: ISO 8601 timestamp (TEXT)
- `direction`: `"in"` = received, `"out"` = sent

### ChatTransport

```typescript
type ChatTransport = {
  sendMessage: (text: string) => Promise<void>;
  poll: (options?: PollOptions) => Promise<ChatMessage[]>;
};

type PollOptions = {
  sinceCreatedAt?: string; // ISO 8601 timestamp
  limit?: number;
};
```

- `sendMessage`: Sends text; transport appends to `inMemoryMessageStore` on success (or optimistic append on failure)
- `poll`: Fetches new messages since `sinceCreatedAt`, returns up to `limit` (default 50)

## Transport Config

```typescript
type OrachatTransportConfig = {
  baseUrl?: string;
  senderId?: string;
  recipientId?: string;
};
```

- `baseUrl`: API root (default: `EXPO_PUBLIC_ORACHAT_API_URL` or `http://10.0.2.2:8000`)
- `senderId` / `recipientId`: When provided (e.g. from local user after registration), used for send/inbox

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/users/register` | Register user for discoverability. Body: `{ username, display_name? }` (mobile sends normalized username and display_name derived from pre-normalized input). Returns `User` (`id`, `username`, `display_name`, timestamps). Backend stores in memory; 409 if username taken. |
| GET | `/users/search?q={query}` | Search users by username. Returns `SearchUser[]` |
| POST | `/messages/send` | Send message. Body: `{ sender_id, recipient_id, content }`. Returns created message with `id`, `content`, `created_at` (ISO) |
| GET | `/messages/inbox?user_id={id}` | Fetch inbox for user. Returns array of messages |
| POST | `/messages/ack/{message_id}` | Acknowledge message (delete from inbox) |

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
  created_at TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out'))
);
CREATE INDEX messages_created_at ON messages(created_at);

CREATE TABLE user (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL,
  display_name TEXT
);
```

- **DB**: `orachat.db`, WAL mode
- **Migrations**: `PRAGMA user_version`; bump `SCHEMA_VERSION` when changing schema
- **Persistence**: Messages — `INSERT OR IGNORE` on append; hydrate on startup. User — single row; written on registration via `setLocalUser()`.

### User schema and registration flow

- **Table `user`**: One row per app install. `id` = backend UUID (from register response), `username` = normalized (lowercase) for uniqueness, `display_name` = derived from username before normalization, used for in-app display.
- **Registration flow**: Register screen (username only) → derive `display_name` from username (before normalize), normalize username → POST `/users/register` with both → store returned user in SQLite → redirect to chat. Chat uses stored user’s `id` as `sender_id`.

### Store API

- `append(newMessages)`: Dedupes by `id`, sorts by `createdAt`, persists, notifies subscribers
- `getSnapshot()` / `subscribe()`: For `useSyncExternalStore`

## Polling Flow

`useChatPolling(transport, intervalMs)`:

1. Polls `transport.poll({ sinceCreatedAt: lastSeen })` on interval
2. On new messages: updates `lastSeenRef`, appends to store
3. Store persists to SQLite and notifies UI

## Extending for Encryption

When adding E2E encryption:

- `ChatMessage.text` can hold ciphertext; add optional `encrypted?: boolean` or separate `ciphertext` field if needed
- Transport layer encrypts before `sendMessage`, decrypts after `poll`
- SQLite schema may need a new column for ciphertext vs plaintext; use migration (bump `SCHEMA_VERSION`)
