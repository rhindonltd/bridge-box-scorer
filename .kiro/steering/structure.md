# Project Structure

## Top level

```
server.ts                  # Custom server: boots Next.js + Socket.IO on one port
next.config.ts             # Next.js config (App Router, TS CLI flag)
drizzle.config.*.ts        # One Drizzle config per SQLite database
src/                       # Application source
tests/                     # Playwright E2E / journey tests
scripts/                   # Build/setup scripts (e.g. TS6 link shim)
.storybook/                # Storybook config and decorators
data/                      # Local SQLite database files (gitignored)
public/                    # Static assets
```

## `src/` layout

- `app/` — Next.js App Router: pages, layouts, and `api/` route handlers. Routes grouped by feature (`create`, `join`, `manage`, `game`, `display`, `settings`).
- `components/` — React components, grouped by area (common, pages, play, results, etc.).
- `context/` — React Contexts (Game, Play, Assignment, Timer, Leaderboard, Traveller) for shared client state.
- `hooks/` — Custom React hooks, including the socket/SWR sync hooks.
- `swr/` — SWR fetchers and cache-key helpers.
- `lib/` — Shared client/server utilities (socket client, fetcher).
- `services/` — Higher-level application/service logic.
- `model/` — Pure domain types and logic (framework-agnostic).
- `movement/` — Movement generation algorithms (Mitchell, Howell, American Whist).
- `scoring/` — Scoring algorithms (matchpoint, IMP, cross-IMP).
- `timer/` — Bridge session timer engine and scheduler.
- `socket/` — Socket.IO server: `handlers/`, `middleware/`, room/event maps (`rooms.ts`, `socket-event-map.ts`, `socket-events.ts`).
- `db/` — Drizzle schemas, queries, and actions, split per database: `game-index/`, `games/`, `movements/`, `players/`, `system/`.
- `scripts/` — Runtime scripts (migrations, EBU sync, movement seeding) run via `tsx`.
- `styles/`, `mocks/` — Global styles and test/dev mocks.

## Conventions

- Keep pure domain logic (`model/`, `movement/`, `scoring/`, `timer/`) free of React and I/O so it stays unit-testable.
- Co-locate tests and stories with their source: `Name.tsx`, `Name.test.tsx`, `Name.stories.tsx`; integration tests use `*.int.test.ts`.
- Data flow (default): SWR fetches initial HTTP data, Socket.IO pushes real-time updates, and a socket→SWR sync hook merges those events into the SWR cache. Route new real-time state through this pattern rather than ad-hoc socket listeners in components.
- Data flow (socket-only screens): for state that lives only over Socket.IO (no HTTP resource), use a feature-scoped context provider that (a) requests its initial slice on mount — and on reconnect — via an acknowledged request event whose data is returned on the callback (e.g. `timer:requestState` → `{ success, data }`), then (b) applies live update events on top. Keep `game:join` a dumb room-join: it must not replay feature state, so joining does not spray every feature's data at every client. The bridge session timer is the reference implementation (`src/context/TimerContext.tsx` + the `timer:requestState` handler).
- Data flow (socket-only, DB-derived features): for live state computed from the database (leaderboard, traveller), extend the pattern with feature-specific rooms and occupancy-gated pushes. The context requests its snapshot via `*:requestState` (which also joins a feature room server-side, e.g. `leaderboard:{gameId}` or `traveller:{gameId}:{boardNumber}`) and emits a matching `*:leave` on unmount/param-change. Every mutation entry point (e.g. `submit-result`, the director `traveller:overrideResult`) calls one shared `broadcastResultsChanged(io, gameId, boardNumber)` that recomputes and pushes a snapshot to each feature room ONLY when that room is occupied (`io.sockets.adapter.rooms.get(room)?.size`). Occupancy gating is a compute-avoidance optimisation only, never correctness — clients always have `*:requestState` as their source of truth. References: `src/context/LeaderboardContext.tsx`, `src/context/TravellerContext.tsx`, `src/socket/handlers/results/`. Non-goals: the board list stays a movement-derived HTTP value (`swrKeys.boards`); exposing it via a `MovementContext`/`game.highestBoard` and replacing the "distinct board numbers" query are future work.
- Each database is a separate Drizzle unit; put schema/queries under the matching `src/db/<db>/` folder and use its dedicated `drizzle.config.<db>.ts`.
