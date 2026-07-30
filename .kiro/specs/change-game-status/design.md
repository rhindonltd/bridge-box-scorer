# Design: Change Game Status

## Overview

Allow the director to change a game's status between CREATED, JOINABLE, and COMPLETE via a simple page accessed from the Director Menu. The feature consists of:

1. A POST API endpoint for updating the status
2. A client page that displays the three status options and calls the endpoint
3. Wiring the existing "Change Game Status" button in the director menu

## Architecture

### API Endpoint

**POST `/api/games/[gameId]/status`**

A Next.js route handler that validates the director token, looks up the game, validates the new status, and persists the change.

```typescript
// src/app/api/games/[gameId]/status/route.ts

import { NextResponse } from "next/server";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { updateGameStatus } from "@/db/game-index/actions/update-game-status";
import { GameStatuses, GameStatus } from "@/db/games/types/game-status";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const gameId = (await params).gameId;

  const body = await req.json();
  const { status, directorToken } = body;

  // Validate director token
  if (!validateDirectorToken(directorToken, gameId)) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  // Validate status value
  if (!GameStatuses.includes(status as GameStatus)) {
    return NextResponse.json(
      { success: false, error: "Invalid status" },
      { status: 400 },
    );
  }

  // Look up game to get numeric id
  const game = await findGameById(gameId);
  if (!game) {
    return NextResponse.json(
      { success: false, error: "Game not found" },
      { status: 404 },
    );
  }

  // Persist the status change
  await updateGameStatus(game.id, status as GameStatus);

  return NextResponse.json({ success: true });
}
```

### Page Component

**Route:** `/manage/[id]/change-status/page.tsx`

A client component that reads the current game status from `useGame()`, displays three status option buttons, and sends the POST request when the director taps a different status.

```typescript
// src/app/manage/[id]/change-status/page.tsx

"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useGame } from "@/context/GameContext";
import { getDirectorToken } from "@/lib/director-token";
import { GameStatus } from "@/db/games/types/game-status";

const STATUS_OPTIONS: { value: GameStatus; label: string }[] = [
  { value: "CREATED", label: "Created" },
  { value: "JOINABLE", label: "Open for Players" },
  { value: "COMPLETE", label: "Complete" },
];

export default function ChangeStatusPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const gameId = params.id;
  const { game, mutateGame } = useGame();
  const [saving, setSaving] = useState(false);

  if (!game) return null;

  async function handleStatusChange(newStatus: GameStatus) {
    if (newStatus === game!.status || saving) return;

    setSaving(true);

    const res = await fetch(`/api/games/${gameId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        directorToken: getDirectorToken(gameId),
      }),
    });

    if (res.ok) {
      mutateGame();
      router.push(`/manage/${gameId}/menu`);
    } else {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-white">
      {/* Header */}
      <div className="bg-gray-200 text-gray-800 py-3 text-center font-bold text-lg shrink-0">
        {game.eventName}
      </div>

      {/* Sub-header */}
      <div className="bg-blue-600 text-white py-2 text-center font-semibold text-base">
        Game Status
      </div>

      {/* Status options */}
      <div className="flex flex-col gap-3 px-6 pt-6 pb-8 max-w-sm w-full mx-auto">
        {STATUS_OPTIONS.map((option) => {
          const isActive = game.status === option.value;
          return (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              disabled={saving}
              className={`w-full py-3.5 text-lg font-semibold rounded-xl transition active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

### Menu Wiring

Update the `onChangeStatusClick` handler in `src/app/manage/[id]/menu/page.tsx`:

```typescript
onChangeStatusClick={() => router.push(`/manage/${id}/change-status`)}
```

## Data Flow

1. Director taps "Change Game Status" in the menu → navigates to `/manage/[id]/change-status`
2. Page renders using `useGame()` to highlight the current status
3. Director taps a different status button
4. Client sends `POST /api/games/[gameId]/status` with `{ status, directorToken }`
5. API validates token → validates status → finds game → calls `updateGameStatus`
6. On success response, client calls `mutateGame()` and navigates back to menu

## Error Handling

| Scenario | Response |
|----------|----------|
| Invalid/missing director token | 401 Unauthorized |
| Invalid status value | 400 Bad Request |
| Game not found | 404 Not Found |
| Database error | 500 Internal Server Error |

On the client side, if the API returns an error the page stays on the current screen (the `saving` state resets). Since this is a low-risk action (easily reversible), no confirmation dialog is needed.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Invalid tokens are always rejected

*For any* string that is not a valid director token for the given game, the POST endpoint SHALL return a 401 Unauthorized response and SHALL NOT modify the game status.

**Validates: Requirements 1.2**

### Property 2: Invalid status values are always rejected

*For any* string that is not one of "CREATED", "JOINABLE", or "COMPLETE", the POST endpoint SHALL return a 400 Bad Request response and SHALL NOT modify the game status.

**Validates: Requirements 1.3**
