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
- `context/` — React Contexts (Game, Play, Assignment) for shared client state.
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
- Data flow: SWR fetches initial HTTP data, Socket.IO pushes real-time updates, and a socket→SWR sync hook merges those events into the SWR cache. Route new real-time state through this pattern rather than ad-hoc socket listeners in components.
- Each database is a separate Drizzle unit; put schema/queries under the matching `src/db/<db>/` folder and use its dedicated `drizzle.config.<db>.ts`.
