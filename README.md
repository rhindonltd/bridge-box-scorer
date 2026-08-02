# Bridge Box Scorer

A real-time scoring application for duplicate bridge clubs. Designed to run on a local "Bridge Box" device during club sessions, it allows directors to manage games and players to enter results at their tables.

## Features

- Create and manage duplicate bridge games (Pairs, Individual)
- Real-time score entry from player devices via WebSocket
- Multiple movement types: Mitchell, Howell, American Whist
- Live session timer with director controls
- Matchpoint, IMP, and Cross-IMP scoring
- Traveller sheets and leaderboard display
- EBU player database integration
- Director authentication with PIN

## Tech Stack

| Layer     | Technology                            |
| --------- | ------------------------------------- |
| Framework | Next.js 16 (App Router)               |
| UI        | React 19, Tailwind CSS 4              |
| Language  | TypeScript 7                          |
| Real-time | Socket.IO 4                           |
| Database  | SQLite (better-sqlite3) + Drizzle ORM |
| State     | SWR + Socket.IO push sync             |
| Testing   | Vitest, Playwright, Storybook 10      |

## Prerequisites

- **Node.js 22+** (see `.nvmrc`)
- npm 10+

## Getting Started

```bash
# Use the correct Node version
nvm use

# Install dependencies
npm install

# Run the development server (Next.js + Socket.IO on port 3000)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command             | Description                                        |
| ------------------- | -------------------------------------------------- |
| `npm run dev`       | Start dev server (Next.js + Socket.IO, hot reload) |
| `npm run build`     | Production build (runs migrations first)           |
| `npm start`         | Start production server                            |
| `npm test`          | Run unit tests (Vitest)                            |
| `npm run coverage`  | Run tests with coverage report                     |
| `npm run e2e`       | Run Playwright E2E tests                           |
| `npm run lint`      | ESLint check                                       |
| `npm run format`    | Prettier format                                    |
| `npm run storybook` | Launch Storybook on port 6006                      |

## Project Structure

```
bridge-box-scorer/
├── server.ts                  # Custom server: Next.js + Socket.IO
├── src/
│   ├── app/                   # Next.js App Router (pages + API routes)
│   ├── components/            # React components (common, pages, play, results)
│   ├── context/               # React Contexts (Game, Play, Assignment)
│   ├── db/                    # Drizzle ORM schemas, queries, actions
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Shared utilities (socket client, fetcher)
│   ├── model/                 # Pure domain types and logic
│   ├── movement/              # Movement generation algorithms
│   ├── scoring/               # Scoring algorithms (MP, IMP, X-IMP)
│   ├── socket/                # Socket.IO server (handlers, middleware)
│   └── timer/                 # Bridge timer engine and scheduler
├── tests/                     # Playwright E2E tests
└── .storybook/                # Storybook configuration
```

## Database

The app uses multiple SQLite databases:

- **game-index** — registry of all games
- **per-game databases** — one `.db` file per game (boards, players, results)
- **movements** — pre-seeded movement definitions
- **players** — EBU membership data
- **system** — director sessions and settings

Database locations are configured via environment variables (see `.env`).

### Migrations

```bash
# Generate a migration (per database)
npm run generate_pairs_migration
npm run generate_individual_migration
npm run generate_movements_migration
npm run generate_players_migration
npm run generate_game_index_migration

# Migrations run automatically on build (prebuild script)
```

## Real-Time Architecture

The app uses a custom server (`server.ts`) that runs both Next.js and Socket.IO on port 3000. Data flows through:

1. **SWR** for initial HTTP data fetching
2. **Socket.IO** for server-pushed real-time updates
3. **`useSocketSWRSync`** hook bridges socket events into the SWR cache

See `.kiro/steering/realtime-sync.md` for full documentation of this pattern.

## Testing

```bash
# Unit tests (co-located as *.test.ts alongside source)
npm test

# Unit tests in watch mode
npx vitest --project unit

# Integration tests (socket handlers)
npx vitest --project unit --run "*.int.test.ts"

# E2E tests (requires running server)
npm run e2e

# Storybook visual tests
npm run storybook
```

## Environment Variables

| Variable              | Default                 | Description                            |
| --------------------- | ----------------------- | -------------------------------------- |
| `DATABASE_URL`        | `./data`                | Directory for system databases         |
| `DATABASE_GAMES_URL`  | `./data/games`          | Directory for per-game databases       |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | App URL (used by socket client + CORS) |

## Deployment

The app is designed to run on a local Bridge Box device (Raspberry Pi or similar). In production:

```bash
npm run build
npm start
```

The custom server handles both HTTP (Next.js) and WebSocket (Socket.IO) traffic on a single port.
