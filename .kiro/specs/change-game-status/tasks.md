# Implementation Plan: Change Game Status

## Overview

Implement the "Change Game Status" feature allowing the director to switch a game between CREATED, JOINABLE, and COMPLETE states. This involves creating a POST API endpoint, a client page with status buttons, and wiring the existing menu button.

## Tasks

- [x] 1. Create the API endpoint
  - [x] 1.1 Create `src/app/api/games/[gameId]/status/route.ts` with a POST handler
    - Validate `directorToken` using `validateDirectorToken(directorToken, gameId)`
    - Validate `status` is one of the `GameStatuses` array values
    - Look up the game via `findGameById(gameId)` to get the numeric `id`
    - Call `updateGameStatus(game.id, status)` to persist
    - Return appropriate error responses (401, 400, 404) for invalid requests
    - _Requirements: 1.1, 1.2, 1.3, 1.6_

  - [ ]* 1.2 Write property tests for the status endpoint
    - **Property 1: Invalid tokens are always rejected**
    - **Property 2: Invalid status values are always rejected**
    - **Validates: Requirements 1.2, 1.3**

- [x] 2. Create the Change Status page
  - [x] 2.1 Create `src/app/manage/[id]/change-status/page.tsx`
    - Use `useGame()` to get the current game status
    - Render three status buttons: "Created", "Open for Players", "Complete"
    - Highlight the current status with `bg-blue-600 text-white`
    - Style inactive options with `bg-gray-200 text-gray-800`
    - On tap of a different status, POST to `/api/games/${gameId}/status` with the new status and director token
    - On success, call `mutateGame()` and navigate back to `/manage/${gameId}/menu`
    - Disable buttons while saving
    - _Requirements: 1.4, 1.5_

- [x] 3. Wire the menu button
  - [x] 3.1 Update `src/app/manage/[id]/menu/page.tsx`
    - Change `onChangeStatusClick` from `alert("Coming soon")` to `router.push(\`/manage/${id}/change-status\`)`
    - _Requirements: 1.5_

- [x] 4. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The feature reuses existing infrastructure: `validateDirectorToken`, `findGameById`, `updateGameStatus`, `useGame()`, and `getDirectorToken`
- No confirmation dialog is needed since status changes are low-risk and easily reversible
- The `GameContext` will auto-update via SWR revalidation after `mutateGame()` is called

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1", "3.1"] }
  ]
}
```
