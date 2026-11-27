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
- `modules/` — Pure domain modules, each imported only through its entry (`@/modules/<name>`); see `docs/design/modules.md`. Each may import only the kernel (`src/model`) and itself, enforced by ESLint.
  - `modules/movement-catalog/` — Every movement fixed before play: Mitchell variants and American Whist teams generators, recommendations, preview display shapes, and planning a fixed movement for the start (`describeMovement` then `planMovement`). Pure entry `@/modules/movement-catalog` (browser-safe); server entry `@/modules/movement-catalog/server` (`server-only`) for the stored catalogue. `storage/` holds `movements.db` (`storage/db/`) and `PSMovements.txt` / `TSMovements.txt` (pair and teams movement libraries); only `server.ts` and `storage/` may use I/O.
  - `modules/interchange/` — File formats: USEBIO 1.2 results files and PBN deal files (writing, and parsing for deal import). Lays out results it is given and scores nothing. Two entries: `@/modules/interchange` (PBN, browser-safe) and `@/modules/interchange/usebio` (the USEBIO writer, server-side because `xmlbuilder2` does not load in the browser). See `docs/design/interchange.md`.
  - `modules/play-flow/` — The player's side of a session: the pair's schedule (`buildScheduleRounds`), where a seat is in it (`resolvePlayPhase`, reads passed in), the dual-side result confirmation (`reconcileSubmissions`), and the player's screen flow (`playReducer`). `services/schedule-service.ts` and `services/resolve-play-state.ts` only read and call it; `hooks/play-flow.ts` drives the screen flow.
  - `modules/timer/` — The bridge session timer: `TimerState` and its configuration, `BridgeTimerEngine` (play/move/break phases), break scheduling and validation, timeline projections and `deriveTimerView` (what a timer screen shows). The live engine store, phase scheduler and start-of-game promotion stay in the core under `services/timer/` because they hold `globalThis` state and use the games database.
  - `modules/seating/` — Whether the seated pairs let a game start: the seat check against a movement's round-1 layout (`validateStart`, `expectedSeatsFromLayout`), teams structure and the Swiss half-match group size, and combining sections all-or-nothing (`aggregateSections`, `flattenSections`). `services/start-game-service.ts` reads the seating, calls these checks, plans round 1 (catalog or Swiss) and writes the boards.
  - `modules/swiss/` — The Swiss Pairs and Swiss Teams round-by-round draw (engines, director edits, history folds, round plans) and EBU §3.5 mismatch detection. The draw and mismatch services are adapters over it.
  - `modules/rulings/` — Every pre-scoring rewrite (handover ids, seat swaps, absences, standings); entry `applyRulings`, `ruledBoardInstances`. Also who holds a seat after a §2.4.7 handover: the handover rules (`chooseHandover`, `MAX_PAIRS_PER_TEAM`, board split) and the ranked / device / merged-line occupant picks. `db/games/actions/handover-seat.ts` reads, applies them and writes.
  - `modules/scoring/` — Scoring algorithms (matchpoint, cross-IMP, Swiss VP, teams) and `scoreEvent` for whole-event standings. Returns numbers only.
  - `modules/results-views/` — Turns scoring's numbers into `ScoreTable`s (traveller, leaderboard, scorecard, teams board result); entry `travellerViews`, `leaderboardViews`. May import scoring's types only.
- `socket/` — Socket.IO server: `handlers/`, `middleware/`, room/event maps (`rooms.ts`, `socket-event-map.ts`, `socket-events.ts`).
- `db/` — Drizzle schemas, queries, and actions, split per database: `game-index/`, `games/`, `players/`, `system/`. `movements.db` is the exception: it lives in `modules/movement-catalog/storage/db/` (its migrations stay in `drizzle/movements`).
- `scripts/` — Runtime scripts (migrations, EBU sync, movement seeding) run via `tsx`.
- `styles/`, `mocks/` — Global styles and test/dev mocks.

## Conventions

- Keep pure domain logic (`model/`, `modules/` except the catalog's `server.ts` and `storage/`) free of React and I/O so it stays unit-testable.
- Co-locate tests and stories with their source: `Name.tsx`, `Name.test.tsx`, `Name.stories.tsx`; integration tests use `*.int.test.ts`.
- Data flow (default): SWR fetches initial HTTP data, Socket.IO pushes real-time updates, and a socket→SWR sync hook merges those events into the SWR cache. Route new real-time state through this pattern rather than ad-hoc socket listeners in components.
- Data flow (socket-only screens): for state that lives only over Socket.IO (no HTTP resource), use a feature-scoped context provider that (a) requests its initial slice on mount — and on reconnect — via an acknowledged request event whose data is returned on the callback (e.g. `timer:requestState` → `{ success, data }`), then (b) applies live update events on top. Keep `game:join` a dumb room-join: it must not replay feature state, so joining does not spray every feature's data at every client. The bridge session timer is the reference implementation (`src/context/TimerContext.tsx` + the `timer:requestState` handler).
- Data flow (socket-only, DB-derived features): for live state computed from the database (leaderboard, traveller), extend the pattern with feature-specific rooms and occupancy-gated pushes. The context requests its snapshot via `*:requestState` (which also joins a feature room server-side, e.g. `leaderboard:{gameId}` or `traveller:{gameId}:{boardNumber}`) and emits a matching `*:leave` on unmount/param-change. Every mutation entry point (e.g. `submit-result`, the director `traveller:overrideResult`) calls one shared `broadcastResultsChanged(io, gameId, boardNumber)` that recomputes and pushes a snapshot to each feature room ONLY when that room is occupied (`io.sockets.adapter.rooms.get(room)?.size`). Occupancy gating is a compute-avoidance optimisation only, never correctness — clients always have `*:requestState` as their source of truth. References: `src/context/LeaderboardContext.tsx`, `src/context/TravellerContext.tsx`, `src/socket/handlers/results/`. Non-goals: the board list stays a movement-derived HTTP value (`swrKeys.boards`); exposing it via a `MovementContext`/`game.highestBoard` and replacing the "distinct board numbers" query are future work.
- Each database is a separate Drizzle unit; put schema/queries under the matching `src/db/<db>/` folder (for `movements.db`, `src/modules/movement-catalog/storage/db/`) and use its dedicated `drizzle.config.<db>.ts`.
- WiFi config handoff (`wifi.json`): the app commits a chosen network by writing `WIFI_CONFIG_PATH` (`/home/bridgebox/wifi.json`), which a systemd watcher on the box observes to connect to the new network. This write MUST be atomic: write a sibling temp file in the same directory, fsync it, then `rename()` it over the target. An in-place write lets the watcher fire mid-write and read a truncated/invalid file (the helper's `jq` empty check then rejects it and skips the connect). Never `writeFileSync` directly to this path — go through `writeWifiConfig` in `src/lib/system/wifi-config.ts`, which owns the atomic write. The temp file must live in the target's own directory (not `/tmp`) so the rename stays on one filesystem and is therefore atomic.
