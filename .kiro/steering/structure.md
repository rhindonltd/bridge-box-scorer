# Project Structure

```
bridge-box-scorer/
├── server.ts                  # Custom entry point: Next.js + Socket.IO
├── src/
│   ├── app/                   # Next.js App Router pages and API routes
│   │   ├── api/               # REST endpoints (route.ts files)
│   │   ├── create/            # Game creation flow
│   │   ├── join/              # Player join flow
│   │   ├── play/              # Active game play UI
│   │   ├── manage/            # Director game management
│   │   └── settings/          # App settings
│   ├── components/            # Reusable React components
│   │   ├── common/            # Shared display components (e.g. GameInfo, ParticipantInfo)
│   │   ├── contract/          # Contract entry UI
│   │   ├── create/            # Game creation components
│   │   ├── join/              # Join flow components
│   │   ├── layout/            # Shell/layout components
│   │   ├── movement/          # Movement selection components
│   │   ├── pages/             # Full-page compositions used by app/ routes
│   │   ├── play/              # In-round play components
│   │   ├── results/           # Results and scoring display
│   │   └── tables/            # Table/board grid components
│   ├── context/               # React Contexts (GameContext, AssignmentContext, etc.)
│   ├── db/                    # Database layer (Drizzle ORM)
│   │   ├── game-index/        # Index DB: registry of all games
│   │   ├── games/             # Per-game databases
│   │   │   ├── pairs/         # Pairs game schema and queries
│   │   │   │   ├── tables/    # Drizzle table definitions
│   │   │   │   ├── actions/   # Next.js Server Actions ("use server")
│   │   │   │   ├── queries/   # Read queries
│   │   │   │   └── index.ts   # getDb(gameId) factory
│   │   │   └── shared/        # Tables shared across game types
│   │   ├── movements/         # Movements DB
│   │   ├── players/           # Players/EBU membership DB
│   │   └── system/            # System-level config DB
│   ├── hooks/                 # Custom React hooks
│   ├── lib/                   # Shared utilities
│   │   ├── socket.ts          # Client socket singleton + emitWithAck/emitEvent
│   │   ├── fetcher.ts         # SWR fetcher
│   │   └── game-service.ts    # High-level client-side game operations (emit wrappers)
│   ├── mocks/                 # Test/Storybook mock data
│   ├── model/                 # Pure domain types and logic (no DB or React imports)
│   │   ├── contract.ts        # Contract codes, parsing, validation
│   │   ├── score.ts           # Scoring types and calculations
│   │   └── common.ts          # Shared domain primitives (Direction, Card, etc.)
│   ├── movement/              # Movement generation algorithms
│   ├── scoring/               # Scoring algorithms (matchpoints, IMPs, etc.)
│   ├── scripts/               # One-off scripts (migrate, seed, sync-ebu-players)
│   ├── socket/                # Socket.IO server layer
│   │   ├── handlers/          # Event handlers (game/, timer/)
│   │   ├── socket-events.ts   # Centralised event name constants
│   │   ├── socket-event-map.ts # Typed event payload map
│   │   ├── socket-response.ts # Standard response envelope type
│   │   └── websocket.ts       # Server initialisation (startSocketServer)
│   ├── swr/                   # SWR key factories
│   ├── timer/                 # Timer logic
│   └── styles/                # Global CSS
├── .storybook/                # Storybook config and decorators
└── drizzle.config.*.ts        # Per-database Drizzle config files
```

## Key Conventions

- **Path alias**: `@/` resolves to `src/`. Always use `@/` imports, never relative `../../`.
- **Components**: Named exports, PascalCase filenames. Props typed with a local `interface Props`.
- **Server Actions**: Files with `"use server"` live in `src/db/*/actions/`. One action per file, named to match the operation (e.g. `create-board.ts` exports `createBoard`).
- **DB queries**: Pure read functions in `src/db/*/queries/`. Server-side only; never import from client components.
- **Model layer**: `src/model/` contains pure TypeScript — no DB, no React, no side effects. Domain types and parse/validate functions go here.
- **Socket events**: Always reference event names from `src/socket/socket-events.ts`, never use raw strings.
- **Stories**: Co-located alongside the component as `ComponentName.stories.tsx`.
- **Tests**: Co-located alongside the source file as `*.test.ts(x)`.
- **File naming**: kebab-case for non-component files; PascalCase for component files.
