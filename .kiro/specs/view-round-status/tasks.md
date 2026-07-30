# Implementation Plan: View Round Status

## Overview

Add a director-facing round status page showing per-table board entry progress. Implementation flows bottom-up: pure logic → API route → page component → menu wiring.

## Tasks

- [ ] 1. Implement pure logic functions
  - [ ] 1.1 Create `src/lib/round-status.ts`
    - Export `BoardEntry` and `TableRoundStatus` interfaces
    - Implement `isBoardEntered()` — returns true if status is NOT_PLAYED, directorOverrideResult is non-null, nsResult is non-null (pairs), or nResult is non-null (individual)
    - Implement `computeRoundStatus()` — groups boards by table, then by round, computes currentRound (highest round with any entered board), boardsEntered/boardsTotal for that round, and detects missing previous rounds
    - Return results sorted by tableNumber
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

  - [ ]* 1.2 Write property tests for `computeRoundStatus` and `isBoardEntered`
    - **Property 1: Current round is the highest round with any entered board**
    - **Property 2: Board counts are accurate for the current round**
    - **Property 3: Missing rounds detection is correct**
    - **Property 4: Board entered classification is exhaustive**
    - **Validates: Requirements 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4**

- [ ] 2. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 3. Implement API route and page
  - [ ] 3.1 Create `src/app/api/games/[gameId]/round-status/route.ts`
    - Export GET handler that looks up the game via `findGameById`
    - Query all boards from the appropriate DB (pairs or individual) based on game type
    - Map rows to `BoardEntry[]` using `isBoardEntered` for the `hasResult` field
    - Pass entries to `computeRoundStatus()` and return JSON `{ tables }`
    - Handle 404 (game not found) and 500 (internal error)
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

  - [ ] 3.2 Create `src/app/manage/[id]/round-status/page.tsx`
    - Client component using `useSWR` with `refreshInterval: 10000`
    - Fetch from `/api/games/${id}/round-status`
    - Render header with game name, blue sub-header "Round Status"
    - Render scrollable card list — each card shows table number, "Round X — Y/Z boards"
    - Show amber warning badge listing missing rounds when `hasMissingPreviousRounds` is true
    - Show green "Complete" badge when all boards in current round are entered
    - Show loading spinner while data is loading
    - _Requirements: 3.1, 3.2, 3.3_

  - [ ] 3.3 Update `src/app/manage/[id]/menu/page.tsx`
    - Wire `onViewRoundStatusClick` to `router.push(\`/manage/${id}/round-status\`)`
    - _Requirements: 3.1_

- [ ] 4. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The pure logic in `round-status.ts` is independently testable without database access
- `GameContext` is already provided by `manage/[id]/layout.tsx` so the page has access to game data
- The existing `fetcher` utility and `useSWR` pattern are already used elsewhere in the project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1", "3.2"] },
    { "id": 3, "tasks": ["3.3"] }
  ]
}
```
