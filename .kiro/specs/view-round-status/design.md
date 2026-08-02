# Design: View Round Status

## Overview

This feature provides a director-facing page that displays at-a-glance round and board entry progress for every table in a game. It consists of:

1. A server-side API endpoint that computes per-table status from the boards database
2. A client-side page that renders the status with auto-refresh

## Architecture

### System Components

```
┌─────────────────────┐       GET /api/games/[gameId]/round-status
│  RoundStatusPage    │ ─────────────────────────────────────────────►┌──────────────────────┐
│  (Client Component) │◄─────────────────────────────────────────────┤  round-status/route  │
│  Auto-refresh 10s   │        JSON response                          │  (API Route)         │
└─────────────────────┘                                               └──────────┬───────────┘
                                                                                  │
                                                                      ┌───────────▼───────────┐
                                                                      │  computeRoundStatus() │
                                                                      │  (Pure logic)         │
                                                                      └───────────┬───────────┘
                                                                                  │
                                                                      ┌───────────▼───────────┐
                                                                      │  SQLite Game DB       │
                                                                      │  (pairs or individual)│
                                                                      └───────────────────────┘
```

### Data Flow

1. Client fetches `GET /api/games/[gameId]/round-status`
2. API route looks up game type from game index DB
3. API route queries ALL boards from the appropriate game DB (pairs or individual)
4. Pure function `computeRoundStatus()` groups boards by table, then by round, and computes status
5. Response returned as JSON

## Components

### 1. `computeRoundStatus` — Pure Logic Function

**File:** `src/lib/round-status.ts`

This is a pure function that takes an array of board data and returns per-table status. Keeping this separate from the API route makes it independently testable.

```typescript
export interface BoardEntry {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  hasResult: boolean; // pre-computed from the "entered" definition
}

export interface TableRoundStatus {
  tableNumber: number;
  currentRound: number;
  boardsEntered: number;
  boardsTotal: number;
  hasMissingPreviousRounds: boolean;
  missingRounds: number[];
}

export function computeRoundStatus(boards: BoardEntry[]): TableRoundStatus[] {
  // 1. Group by tableNumber
  // 2. For each table, group by roundNumber
  // 3. For each round, count entered vs total
  // 4. currentRound = highest round with at least one entered board
  // 5. hasMissingPreviousRounds = any round < currentRound has unentered boards
  // 6. missingRounds = list of rounds < currentRound with unentered boards
  // Returns sorted by tableNumber
}
```

### 2. `isBoardEntered` — Board Entry Check

**File:** `src/lib/round-status.ts`

Helper that encapsulates the "entered" definition:

```typescript
export function isBoardEntered(board: {
  nsResult?: string | null; // pairs
  nResult?: string | null; // individual
  directorOverrideResult?: string | null;
  status?: string | null;
}): boolean {
  if (board.status === "NOT_PLAYED") return true;
  if (board.directorOverrideResult != null) return true;
  if (board.nsResult != null) return true;
  if (board.nResult != null) return true;
  return false;
}
```

### 3. API Route

**File:** `src/app/api/games/[gameId]/round-status/route.ts`

```typescript
import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { getDb as getPairsDb } from "@/db/games/pairs";
import { getDb as getIndividualDb } from "@/db/games/individual";
import { boards as pairsBoards } from "@/db/games/pairs/tables/boards";
import { boards as individualBoards } from "@/db/games/individual/tables/boards";
import {
  computeRoundStatus,
  isBoardEntered,
  BoardEntry,
} from "@/lib/round-status";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;

  try {
    const game = await findGameById(gameId);
    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found" },
        { status: 404 },
      );
    }

    let entries: BoardEntry[];

    if (game.gameType === "INDIVIDUAL") {
      const db = await getIndividualDb(gameId);
      const rows = await db.select().from(individualBoards);
      entries = rows.map((row) => ({
        roundNumber: row.roundNumber,
        tableNumber: row.tableNumber,
        boardNumber: row.boardNumber,
        hasResult: isBoardEntered({
          nResult: row.nResult,
          directorOverrideResult: row.directorOverrideResult,
          status: row.status,
        }),
      }));
    } else {
      const db = await getPairsDb(gameId);
      const rows = await db.select().from(pairsBoards);
      entries = rows.map((row) => ({
        roundNumber: row.roundNumber,
        tableNumber: row.tableNumber,
        boardNumber: row.boardNumber,
        hasResult: isBoardEntered({
          nsResult: row.nsResult,
          directorOverrideResult: row.directorOverrideResult,
          status: row.status,
        }),
      }));
    }

    const tables = computeRoundStatus(entries);
    return NextResponse.json({ tables });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
```

### 4. Page Component

**File:** `src/app/manage/[id]/round-status/page.tsx`

```typescript
"use client";

import { useParams } from "next/navigation";
import { useGame } from "@/context/GameContext";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { TableRoundStatus } from "@/lib/round-status";

interface RoundStatusResponse {
  tables: TableRoundStatus[];
}

export default function RoundStatusPage() {
  const params = useParams<{ id: string }>();
  const { game } = useGame();

  const { data, isLoading } = useSWR<RoundStatusResponse>(
    `/api/games/${params.id}/round-status`,
    fetcher,
    { refreshInterval: 10000 },
  );

  // Render header, sub-header, and scrollable card list
  // Each card shows table number, "Round X — Y/Z boards", and warning badge
}
```

### 5. Director Menu Wiring

**File:** `src/app/manage/[id]/menu/page.tsx`

Update the `onViewRoundStatusClick` handler:

```typescript
onViewRoundStatusClick={() => router.push(`/manage/${id}/round-status`)}
```

## Interfaces

### API Response

```typescript
interface RoundStatusResponse {
  tables: TableRoundStatus[];
}

interface TableRoundStatus {
  tableNumber: number;
  currentRound: number;
  boardsEntered: number;
  boardsTotal: number;
  hasMissingPreviousRounds: boolean;
  missingRounds: number[];
}
```

### Internal Types

```typescript
interface BoardEntry {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  hasResult: boolean;
}
```

## Error Handling

| Scenario                                  | Behaviour                                                     |
| ----------------------------------------- | ------------------------------------------------------------- |
| Game not found                            | 404 with `{ success: false, error: "Game not found" }`        |
| Database error                            | 500 with `{ success: false, error: "Internal server error" }` |
| No boards in game                         | Return `{ tables: [] }`                                       |
| Table with no entered boards in any round | `currentRound: 0`, `boardsEntered: 0`, `boardsTotal: 0`       |

## UI Design

- Page background: `bg-white`
- Header: `bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg` — game name
- Sub-header: `bg-blue-600 text-white px-3 py-2.5 text-center font-bold text-lg` — "Round Status"
- Table cards: `bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`
  - Table number: `font-semibold text-base text-gray-900`
  - Round/progress: `text-sm text-gray-600` — "Round X — Y/Z boards"
  - Warning badge: `text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full text-xs font-medium` — "Missing: Round X, Y"
  - Complete indicator: `text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium` — "Complete"
- Loading state: spinner centered on page

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Current round is the highest round with any entered board

_For any_ set of boards across multiple rounds and tables, the computed `currentRound` for each table SHALL equal the highest round number where at least one board has `hasResult === true`. If no board at a table has a result, `currentRound` SHALL be 0.

**Validates: Requirements 1.1**

### Property 2: Board counts are accurate for the current round

_For any_ set of boards, the computed `boardsEntered` for each table SHALL equal the count of boards in `currentRound` where `hasResult === true`, and `boardsTotal` SHALL equal the total number of boards in `currentRound` at that table.

**Validates: Requirements 1.2**

### Property 3: Missing rounds detection is correct

_For any_ set of boards where a table's `currentRound` > 1, `hasMissingPreviousRounds` SHALL be true if and only if there exists at least one round R < `currentRound` where at least one board at that table has `hasResult === false`. The `missingRounds` array SHALL contain exactly those round numbers.

**Validates: Requirements 1.3**

### Property 4: Board entered classification is exhaustive

_For any_ board, `isBoardEntered` SHALL return true if and only if at least one of the following holds: (a) `status === "NOT_PLAYED"`, (b) `directorOverrideResult` is non-null, (c) `nsResult` is non-null (pairs), or (d) `nResult` is non-null (individual). Otherwise it SHALL return false.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 5: Rendered output contains all required information

_For any_ array of `TableRoundStatus` objects, the rendered page SHALL display a card for each table containing: the table number, the round and board progress text, and (if `hasMissingPreviousRounds` is true) a warning indicator listing the missing rounds.

**Validates: Requirements 3.3**
