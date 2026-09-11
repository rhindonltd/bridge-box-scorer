# Mutation transport: HTTP vs Socket

Decision record for how each client-initiated mutation should reach the server.

## Principle

A mutation should not also own its fan-out. Separate **the write** from **the
broadcast decision**:

- **HTTP write** — director/setup/auth/one-shot operations. They benefit from
  route middleware (`withDirectorRoute`/`withGameRoute`: uniform 401/404/400 +
  Zod validation), status codes, and easy testing. The resulting live update is
  pushed by calling a shared broadcast helper (which the route invokes via the
  server's `io` instance, obtained from `getIO()` in `src/socket/websocket.ts`).
- **Keep socket** — live-collaboration hot paths (result entry, timer control,
  self-seating) where low latency and a single ordered channel matter, and a
  two-channel (HTTP write + socket event) race would cause flicker/ordering
  bugs.
- **Either / low-priority** — works fine as-is; migrate only opportunistically.

Deployment context (single Raspberry-Pi appliance, ~dozens of LAN clients,
offline-capable) means the usual HTTP-at-scale wins (load balancing, CDN,
horizontal scaling) don't apply — so this is about code clarity and
testability, not throughput.

## Table

| Mutation (event) | What it does | Actor | Live? | Recommended | Why |
|---|---|---|---|---|---|
| `CREATE_GAME` | Create a new game | Director (pre-token) | No | **HTTP write** ✅ done | `POST /api/games` (201, no auth); returns `{ game, directorToken }` and broadcasts `JOINABLE_GAMES` via shared `broadcastJoinableGames`. |
| `CREATE_SECTION` | Add a section | Director | Setup | **HTTP write** ✅ done | Director-only; wants route validation (duplicate letter) + 4xx. |
| `RENAME_SECTION` | Rename a section | Director | Setup | **HTTP write** ✅ done | Pure setup, low frequency. |
| `DELETE_SECTION` | Delete a section | Director | Setup | **HTTP write** ✅ done | Destructive, director-only; status codes + guard errors. |
| `SET_SECTION_MOVEMENT` | Choose a section's movement | Director | Setup | **HTTP write** ✅ done | Setup-time; validation-heavy. Emits `SECTION_UPDATED` + `GAME_UPDATED` and clears the section timer on change. |
| `UPDATE_TABLES` | Resize a section's table count | Director | Setup | **HTTP write** ✅ done | Setup-time; shrink guard maps to a 4xx. |
| `EVICT_PARTICIPANT` | Remove a seated pair | Director | Setup (mild live) | **HTTP write** ✅ done | Director-only; others revalidate via `PARTICIPANTS`. `DELETE /api/games/[id]/participants/[seat]`; broadcasts via shared `broadcastParticipants`. |
| `START_GAME` | Materialize movement + start | Director | Setup→live boundary | **HTTP write** ✅ done | `POST /api/games/[id]/start`; 409 + `problems` when not startable, else promotes the timer and broadcasts `GAME_UPDATED` via `broadcastGameStarted`. |
| `GENERATE_SHARE_CODE` | Mint a co-director share code | Director | No | **HTTP write** ✅ done | `POST /api/games/[id]/share-code`; returns `{ code }` to the caller only (no broadcast). Infra failures → 500. |
| `CLAIM_DIRECTOR_CODE` | Claim a share code → token | Would-be director | No | **HTTP write** ✅ done | `POST /api/director-codes/claim` (`withBasicRoute`, unauthenticated — the code is the credential). Invalid/expired/used code → 400; returns `{ directorToken, gameId }`. |
| `SAVE_CONFIG_TIMER` | Persist a not-started timer config | Director | Setup | **HTTP write** ✅ done | `PUT /api/games/[id]/sections/[section]/timer/config`; persists the configured (not-started) state and broadcasts `timer:sync` via `broadcastTimerConfigSaved`. Client auto-saves fire-and-forget. |
| `CREATE_TIMER` | Create/initialize a timer | Director | Live-ish | **Removed** ✅ | Dead in production — no UI emitted it. A timer comes to life only via `promoteTimerAtGameStart` at game start. Handler + event deleted; tests seed a live timer via a test-support helper. |
| `CREATE_PARTICIPANT` | Player seats themselves | Player | **Yes** | **Keep socket** | High-frequency concurrent seat-taking; live seat-disable relies on immediate `PARTICIPANTS` fan-out. |
| `SUBMIT_RESULT` | Enter/confirm a board result | Player | **Yes (hot path)** | **Keep socket** | Core live loop: dual-side confirm, mismatch, leaderboard/traveller pushes. |
| `OVERRIDE_RESULT_TRAVELLER` | Director corrects a result | Director | **Yes** | **Keep socket** | Shares `broadcastResultsChanged` with `SUBMIT_RESULT`. |
| `START_TIMER` | Start the running timer | Director | **Yes** | **Keep socket** | Live control; instant + ordered on all devices. |
| `PAUSE_TIMER` | Pause | Director | **Yes** | **Keep socket** | Same. |
| `NEXT_ROUND_TIMER` | Advance phase/round | Director | **Yes** | **Keep socket** | Same. |
| `PREVIOUS_TIMER` | Step back a phase | Director | **Yes** | **Keep socket** | Same. |
| `ADJUST_TIME_TIMER` | ±time adjustment | Director | **Yes** | **Keep socket** | Frequent; must land on all clients immediately. |
| `UPDATE_CONFIG_TIMER` | Live config change while running | Director | **Yes** | **Keep socket** | Applies to a running timer; live broadcaster coupled. |
| `LEAVE_GAME` | Leave the game room | Any | n/a | **Keep socket** | Connection/room lifecycle. |
| `LEAVE_TIMER` / `LEAVE_LEADERBOARD` / `LEAVE_TRAVELLER` | Leave a feature room | Any | n/a | **Keep socket** | Room membership; not mutations. |
| `REQUEST_STATE_TIMER` / `_LEADERBOARD` / `_TRAVELLER` | Snapshot request + join room | Any | n/a | **Keep socket** | Reads tied to room joins (request-on-mount). |

## Rollout

The clean split is: **setup/admin/auth mutations → HTTP**; **live-play + timer
control → socket**. Two enablers make the HTTP migration low-risk:

1. `withDirectorRoute`/`withGameRoute` already give uniform auth + status codes.
2. The broadcast decision must be a shared helper the route can call. Extracting
   "the mutation doesn't own its fan-out" is worth doing even for events that
   stay on the socket.

### Pilot (done): section mutations

The section mutations (`CREATE_SECTION`, `RENAME_SECTION`, `DELETE_SECTION`,
`SET_SECTION_MOVEMENT`, `UPDATE_TABLES`) were the first migration — all
director-only, all funnelling through `broadcastSections`. Implementation:

- HTTP routes under `src/app/api/games/[gameId]/sections/` using
  `withDirectorRoute` (header auth `x-director-token`).
- Shared broadcaster `src/socket/broadcast/section-broadcast.ts`, invoked by the
  routes via `getIO()`, emitting `GAME_UPDATED` / `SECTION_UPDATED` /
  `TIMER_CLEARED`.
- Client `src/lib/section-service.ts` uses `fetch` (same function signatures).
- The socket write handlers and their now-unused event constants were removed.

### Participant eviction (done)

`EVICT_PARTICIPANT` → `DELETE /api/games/[gameId]/participants/[seat]`
(`withDirectorRoute`). Shared broadcaster `broadcastParticipants(gameId, io?)`
(`src/socket/broadcast/participant-broadcast.ts`) is reused by the remaining
socket `CREATE_PARTICIPANT` handler (which passes its own `io`) and the new
route (which falls back to `getIO()`). Errors are classified via
`src/lib/api/client-error.ts` — `ClientError` → 400, anything else → logged 500.
Client `src/lib/participant-service.ts` `evictParticipant`.

### Game creation (done)

`CREATE_GAME` → `POST /api/games` (`withBasicRoute`, no auth — anyone can
create). Validates the body (`ClientError` → 400), provisions the game DB,
creates the director login session, returns `201 { game, directorToken }`
(client stores the token), and broadcasts globally via
`broadcastJoinableGames(io?)` (`src/socket/broadcast/joinable-broadcast.ts`).
Client `game-service.createGame` uses `fetch`.

### Starting a game (done)

`START_GAME` → `POST /api/games/[gameId]/start` (`withDirectorRoute`). Re-runs
the `startGame` service server-side; returns **409** with the blocking
`problems` when not startable. On success it promotes any setup-configured timer
(`promoteTimerAtGameStart`, only when `getIO()` is live) and broadcasts
`GAME_UPDATED { game }` via `broadcastGameStarted(gameId, io?)`
(`src/socket/broadcast/game-broadcast.ts`). Infra failures → 500. Client
`game-service.startGame` uses `fetch` and throws the server message on failure.

### Director share codes (done)

Both share-code events are now HTTP routes; the socket handler is gone.

- **Generate** — `GENERATE_SHARE_CODE` → `POST /api/games/[gameId]/share-code`
  (`withDirectorRoute`). Mints a single-use code via `createShareCode` and
  returns `{ code }` to the caller only — nothing to broadcast. Infra failures →
  500. Client: `game-service.generateShareCode`.
- **Claim** — `CLAIM_DIRECTOR_CODE` → `POST /api/director-codes/claim`
  (`withBasicRoute`, unauthenticated — the caller has no token yet, so the code
  itself is the credential). Validates and claims via `validateAndClaimShareCode`;
  an invalid/expired/already-used code is a `ClientError` → 400 with the reason.
  On success it mints a director login session and returns
  `{ directorToken, gameId }`, which the client stores keyed by `gameId`. Infra
  failures → 500. Client: `game-service.claimDirectorCode`.

The route is top-level (not game-scoped by URL) because the claimer doesn't know
the `gameId` — the code resolves it.

### Saving a timer config (done)

`SAVE_CONFIG_TIMER` → `PUT /api/games/[gameId]/sections/[section]/timer/config`
(`withDirectorRoute`). Builds a "configured but not started" state via
`buildConfiguredTimerState`, persists it with `updateTimerState`, and broadcasts
`timer:sync` to the section's timer room via `broadcastTimerConfigSaved`
(`src/socket/broadcast/timer-broadcast.ts`, optional `io` → `getIO()` fallback).
It never starts an engine or schedules phases — the config is promoted to a live
timer only at game start. Bad body → 400; infra failures → 500.

The client (`TimerSetup`) auto-saves on a debounce and flushes on unmount
(section switch / navigation), so `timer-service.saveTimerConfig` is called
fire-and-forget: the container doesn't await it and just logs a failure. This
was the one borderline case in the table — it landed on HTTP because it's pure
setup-time persistence with no live consumers until start, and the `timer:sync`
echo it needs is exactly what the shared broadcaster provides.

### Removing CREATE_TIMER (done)

`CREATE_TIMER` was the last "either" candidate, but tracing its callers showed
it had no production emitter: timer setup uses the config route
(`SAVE_CONFIG_TIMER`), and a timer only comes to life via
`promoteTimerAtGameStart` when the game starts (which builds the engine, starts
it, and schedules its phases — exactly what `CREATE_TIMER` did, plus
`engine.start()`). So rather than pick a transport, the event was deleted:
handler, registration, and the `CREATE_TIMER` constant are gone. The two
integration tests that used it as a shortcut to seed a running timer now call a
small test-support helper (`seedLiveTimer`) that creates the engine and
broadcasts directly.

### Remaining on the socket (by design)

Everything still on the socket is a live or near-live concern:

- **Live timer controls** — `START_TIMER`, `PAUSE_TIMER`, `NEXT_ROUND_TIMER`,
  `PREVIOUS_TIMER`, `ADJUST_TIME_TIMER`, `UPDATE_CONFIG_TIMER`: instant, ordered
  control of a running timer, driving scheduler-backed `timer:sync` broadcasts.
- **Live hot paths** — `CREATE_PARTICIPANT` (concurrent seat-taking with
  immediate `PARTICIPANTS` fan-out), `SUBMIT_RESULT` (dual-side confirm /
  mismatch / leaderboard + traveller pushes), and `OVERRIDE_RESULT_TRAVELLER`
  (shares `broadcastResultsChanged` with `SUBMIT_RESULT`).
- **Room/snapshot request events** — `JOIN_GAME`, `LEAVE_GAME`, the
  `*:requestState` / `*:leave` pairs for timer/leaderboard/traveller.

With the director/setup/one-shot mutations migrated and `CREATE_TIMER` removed,
the socket write surface is now exactly the live-collaboration core.
