# Real-Time Data Sync Pattern: SWR + Socket.IO

This project uses a three-layer real-time data architecture:

1. **SWR** — HTTP-based server state cache (initial load + revalidation)
2. **Socket.IO** — Push-based real-time updates from server to client
3. **React Context** — Composition layer that combines both into component-accessible state

## How It Works

```
┌─────────────┐     GET /api/...      ┌──────────────┐
│  SWR Cache  │◄─────────────────────►│  Next.js API │
└──────┬──────┘                        └──────────────┘
       │
       │ mutate(key, data, false)
       │
┌──────┴──────┐     socket event       ┌──────────────┐
│  useSocket  │◄────────────────────── │  Socket.IO   │
│  SWRSync    │                         │  Server      │
└─────────────┘                         └──────────────┘
```

### Initial Load
Components use `useSWR(key, fetcher)` to fetch data from API routes on mount.

### Real-Time Updates
The `useSocketSWRSync` hook subscribes to a Socket.IO event and, when fired, directly mutates the SWR cache with the new data — bypassing the HTTP layer entirely.

### Key Files

- `src/hooks/socket-swr-sync.ts` — The bridge hook. Takes a socket event name, a handler that maps the event payload to an SWR cache key + data, and dependency array.
- `src/swr/swr-keys.ts` — Centralised SWR key factories. Socket sync handlers must use the same keys as the initial SWR fetches.
- `src/socket/socket-events.ts` — All event names as typed constants.
- `src/socket/socket-event-map.ts` — Type-safe payload map for socket events.

## Usage Pattern

```tsx
// 1. Fetch initial data via SWR
const { data } = useSWR<Individual[]>(swrKeys.individuals(gameId), fetcher);

// 2. Subscribe to real-time updates that mutate the same cache key
useSocketSWRSync(
  SocketEvents.PARTICIPANTS,
  (payload) => ({
    key: swrKeys.individuals(gameId),
    data: payload.participants,
  }),
  [gameId],
);
```

## Rules

1. **SWR keys must match** — The key used in `useSWR()` and the key returned by the socket sync handler must be identical. Use `swrKeys.*` factories for both.
2. **Optimistic=false** — The third argument to `mutate()` is `false` (no revalidation). The socket event IS the source of truth.
3. **One event per cache key** — Each socket event should map to exactly one SWR key. Don't split one event across multiple keys.
4. **Dependencies** — Include any values in `deps` that affect the key computation (typically `[gameId]`).
5. **Server broadcasts** — Socket handlers must emit to the correct room (use `Rooms.game(gameId)`) so only relevant clients receive updates.

## Timer Sync (Different Pattern)

The timer uses a separate pattern (`useTimerSync`) because timer state updates at 1Hz from a single `TIMER_SYNC` event and doesn't go through SWR at all — it's stored in local component state with a server time offset correction.

## Adding a New Real-Time Feature

1. Define the event name in `src/socket/socket-events.ts`
2. Add the payload type to `src/socket/socket-event-map.ts`
3. Add the SWR key to `src/swr/swr-keys.ts`
4. Create an API route for the initial GET
5. Emit from the socket handler after mutations: `io.to(Rooms.game(gameId)).emit(event, payload)`
6. In the component, use `useSWR` + `useSocketSWRSync` with matching keys
