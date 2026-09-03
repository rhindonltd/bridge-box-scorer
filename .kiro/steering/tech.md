# Tech Stack

## Runtime & tooling

- Node.js 24.19.0 (pinned in `.nvmrc`; run `nvm use`)
- npm as the package manager (`package-lock.json`)
- TypeScript in `strict` mode; path alias `@/*` maps to `src/*`
- Custom server (`server.ts`) runs Next.js and Socket.IO together on one port, launched via `tsx`

## Frameworks & libraries

- Next.js 16 (App Router) with React 19
- Tailwind CSS 4 for styling; Headless UI + lucide-react for UI primitives
- Socket.IO 4 (`socket.io` / `socket.io-client`) for real-time transport
- Drizzle ORM over SQLite (`better-sqlite3`); multiple databases (see `drizzle.config.*.ts`)
- SWR for HTTP data fetching, bridged to socket events for live updates
- Zustand for client state; Zod for validation
- bcrypt for director PIN hashing; xmlbuilder2 and csv-parse for data import/export

## Testing & quality

- Vitest for unit tests (jsdom, `--project unit`), co-located as `*.test.ts(x)`; integration tests as `*.int.test.ts`
- Playwright for E2E / journey tests in `tests/`
- Storybook 10 for component development and visual tests
- ESLint (`eslint-config-next`) and Prettier for lint/format

## Common commands

```bash
# Development (Next.js + Socket.IO, hot reload)
npm run dev

# Production build (runs DB migrations first via prebuild) and start
npm run build
npm start

# Unit tests
npm test
npx vitest --project unit          # watch mode
npm run coverage                   # with coverage report

# E2E / journeys (require a running server)
npm run journey:phone
npm run journey:tablet
npm run journey:all
npm run e2e_ui                     # Playwright UI mode

# Lint & format
npm run lint
npm run format

# Storybook
npm run storybook                  # dev server on port 6006
npm run build-storybook
```

## Database migrations

Each SQLite database has its own Drizzle config and migration scripts. Migrations run automatically on `build` (prebuild). To manage manually:

```bash
npm run generate_<db>_migration   # e.g. generate_movements_migration
npm run run_<db>_migration        # e.g. run_movements_migration
```

Databases: `game-index`, per-game `games`, `movements`, `players`, `system`.

## Conventions & gotchas

- Prefer the `@/*` import alias over long relative paths.
- `any` is disallowed except in test files, mock factories, Storybook decorators, and `src/socket/test/**`.
- TypeScript 7 lacks the compiler API Next.js expects; `next.config.ts` sets `useTypeScriptCli: true` and there is a TS6 shim (`scripts/link-ts6.mjs` postinstall). Do not remove these.
- Do not commit or read secrets from `.env`; database directories are configured via env vars (`DATABASE_URL`, `DATABASE_GAMES_URL`, `NEXT_PUBLIC_APP_URL`).
