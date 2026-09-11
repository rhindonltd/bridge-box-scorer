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
| `CLAIM_DIRECTOR_CODE` | Claim a share code → token | Would-be director | No | **HTTP write** | Auth exchange; returns a token. |
| `SAVE_CONFIG_TIMER` | Persist a not-started timer config | Director | Setup | **HTTP write** (borderline) | Setup-time persistence; no live consumers until start. Could stay socket for symmetry. |
| `CREATE_TIMER` | Create/initialize a timer | Director | Live-ish | **Either** | HTTP if it only initializes state; socket if coupled to the live broadcaster. |
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

### Generating a share code (done)

`GENERATE_SHARE_CODE` → `POST /api/games/[gameId]/share-code`
(`withDirectorRoute`). Mints a single-use code via `createShareCode` and returns
`{ code }` to the caller only — there is nothing to broadcast. Infra failures →
500 via `respondToActionError`. Client `game-service.generateShareCode` uses
`fetch` and throws the server message on failure. `CLAIM_DIRECTOR_CODE` stays on
the socket: the claimer has no director token yet, so it can't ride the
director-authed HTTP path.

### Next candidates

`CLAIM_DIRECTOR_CODE` is the remaining share-code event. It's an unauthenticated
auth exchange (no director token yet), so if migrated it would use
`withBasicRoute` and return the minted token in the body, following the
`ClientError`/`respondToActionError` shape for 400 vs 500 — mirroring
`POST /api/games`.
