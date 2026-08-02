# Tech Stack

## Runtime & Framework

- **Next.js 16** (App Router) — UI and REST API routes
- **React 19** — component layer
- **TypeScript** (strict mode) — used throughout; `@/*` aliases to `src/*`
- **Node.js** — server runtime via a custom `server.ts` entry point

## Custom Server

`server.ts` combines Next.js and Socket.IO on a single HTTP server (port 3000). This is the entry point for both dev and production. Next.js alone is **not** sufficient — always use the custom server.

```
dev:   tsx watch server.ts
prod:  NODE_ENV=production tsx server.ts
```

## Database

- **better-sqlite3** — embedded SQLite, no separate DB process needed
- **Drizzle ORM** — schema definitions, migrations, and queries
- Each game gets its own `.db` file; location controlled by `DATABASE_GAMES_URL` env var
- Separate databases exist for: game index, players, movements, system
- Schema tables are defined in `src/db/*/tables/` and exported via `src/db/*/schema.ts`
- Types are inferred from the schema: `typeof table.$inferInsert` / `$inferSelect`

## Real-Time

- **Socket.IO 4** — bidirectional communication between server and clients
- Server-side handlers registered in `src/socket/handlers/`
- Client emits via `emitWithAck` / `emitEvent` helpers in `src/lib/socket.ts`
- All event names live in `src/socket/socket-events.ts` (central registry)
- Typed event map in `src/socket/socket-event-map.ts`

## State Management

- **SWR** — server state fetching and caching; keys centralised in `src/swr/swr-keys.ts`
- **React Context** — wraps SWR data and socket subscriptions (e.g. `GameContext`, `AssignmentContext`)
- **Zustand** — available for local UI state where needed

## Styling

- **Tailwind CSS v4** — utility-first, applied directly in JSX
- No CSS modules or styled-components

## Validation

- **Zod v4** — runtime schema validation, especially for API and socket payloads

## Testing

- **Vitest** — unit tests (project: `unit`), co-located as `*.test.ts(x)`
- **Storybook 10** — component stories co-located as `*.stories.tsx`; also runs via Vitest (project: `storybook`)
- **Playwright** — end-to-end tests
- **Testing Library** — DOM assertions in unit tests

## Common Commands

| Task                     | Command             |
| ------------------------ | ------------------- |
| Dev server               | `npm run dev`       |
| Production build         | `npm run build`     |
| Production start         | `npm start`         |
| Unit tests               | `npm test`          |
| Unit tests with coverage | `npm run coverage`  |
| E2E tests                | `npm run e2e`       |
| Storybook                | `npm run storybook` |
| Lint                     | `npm run lint`      |
| Format                   | `npm run format`    |

## Database Migrations

Each database has its own Drizzle config. Generate then apply:

```
npm run generate_pairs_migration   # generate SQL for pairs game DB
npm run generate_players_migration
npm run generate_movements_migration
npm run generate_game_index_migration
```

The `prebuild` script runs `src/scripts/migrate.ts` automatically before every build.
