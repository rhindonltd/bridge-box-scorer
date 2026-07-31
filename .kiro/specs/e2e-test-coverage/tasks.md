# Implementation Plan: E2E Test Coverage

## Overview

Expand the Playwright E2E test suite with shared fixtures and 13 new/expanded test files covering all 14 requirement areas. Shared infrastructure (fixtures, helpers) is built first, then independent test files can be implemented in parallel.

## Tasks

- [x] 1. Create shared test fixtures and helpers
  - [x] 1.1 Create `tests/fixtures/game-fixture.ts` — shared fixture that creates a game via the UI form, extracts gameId from URL and directorToken from localStorage, exposes `GameFixture` type with `gameId`, `eventName`, `directorToken`
    - Implement `createGameViaUI` helper function
    - Export `test` extended with `gameFixture` fixture
    - _Requirements: 1.1, 1.2 (game creation is prerequisite for all director tests)_

  - [x] 1.2 Create `tests/fixtures/director-fixture.ts` — extends game fixture to provide a `DirectorContext` with `page`, `gameId`, `eventName`, `directorToken` for director-authenticated page access
    - Create game via UI, extract token, expose context object
    - _Requirements: 3.1, 14.3 (director authentication prerequisite)_

  - [x] 1.3 Create `tests/fixtures/helpers.ts` — shared utility functions: `navigateToDirectorPage(page, gameId, subPage)`, `interceptRoute(page, urlPattern, response)`, `makeGameJoinable(request, gameId, directorToken)`
    - `makeGameJoinable` calls `POST /api/games/{gameId}/status` with `{ status: "JOINABLE", directorToken }`
    - `interceptRoute` uses `page.route()` to mock API responses for error testing
    - _Requirements: 2.1, 4.2 (joinable state needed for join tests)_

- [x] 2. Expand existing `tests/create-game.spec.ts`
  - [x] 2.1 Add test: full form submission creates game via Socket.IO and redirects to `/create/[id]`
    - Fill Event Name, Director Name, Event Type, Tables, click Next
    - Assert URL matches `/create/{uuid}`
    - _Requirements: 1.2_

  - [x] 2.2 Add test: Socket.IO unavailable shows error message
    - Use `page.route("**/socket.io/**", route => route.abort())` before form submission
    - Assert error text is visible
    - _Requirements: 1.3_

  - [x] 2.3 Add test: Pairs game appears in `/api/games/all` with `gameType: "PAIRS"`
    - Create game with Event Type "Pairs", query API, assert response shape
    - _Requirements: 1.4_

  - [x] 2.4 Add test: Individual game appears in `/api/games/all` with `gameType: "INDIVIDUAL"`
    - Select "Individual" event type, create game, query API, assert response shape
    - _Requirements: 1.5_

- [x] 3. Expand existing `tests/join-game.spec.ts`
  - [x] 3.1 Add test: joinable game card is visible on `/join/select-game` with event name
    - Use game fixture + `makeGameJoinable`, navigate to select-game page, assert game card visible with event name text
    - _Requirements: 2.1_

  - [x] 3.2 Add test: tapping game card navigates to `/join/[gameId]/menu`
    - Click game card, assert URL
    - _Requirements: 2.2_

  - [x] 3.3 Add test: join menu shows "Join As Player", "Show Timer", "Show Leaderboard" buttons
    - Navigate to `/join/[gameId]/menu`, assert all three buttons visible
    - _Requirements: 2.3_

  - [x] 3.4 Add test: "Join As Player" navigates to `/join/[gameId]/player`
    - Click button, assert URL
    - _Requirements: 2.4_

  - [x] 3.5 Add test: player page renders seat selection options
    - Navigate to player page, assert seat elements are visible
    - _Requirements: 2.5_

- [x] 4. Expand existing `tests/manage-games.spec.ts`
  - [x] 4.1 Add test: game card is displayed with event name on `/manage/select-game`
    - Create game via fixture, navigate to manage select-game, assert card with event name
    - _Requirements: 14.1_

  - [x] 4.2 Add test: tapping game card without director token shows claim code screen
    - Use a fresh browser context without the director token in localStorage, tap card, assert claim code UI
    - _Requirements: 14.2_

  - [x] 4.3 Add test: entering valid director code navigates to `/manage/[id]/menu`
    - Enter code on claim screen, assert navigation to menu
    - _Requirements: 14.3_

  - [x] 4.4 Add test: tapping "Cancel" on claim code returns to game list
    - Click cancel, assert URL is `/manage/select-game`
    - _Requirements: 14.4_

- [x] 5. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Create `tests/director-menu.spec.ts`
  - [x] 6.1 Verify director menu renders all 6 buttons: Timer, Travellers, Change Status, Movement, Download USEBIO, Delete Game
    - Use director fixture, navigate to `/manage/[id]/menu`, assert all 6 buttons visible by role/name
    - _Requirements: 3.1_

  - [x] 6.2 Add tests for each menu button navigation: Timer → `/manage/[id]/timer`, Travellers → `/manage/[id]/correct-result`, Change Status → `/manage/[id]/change-status`, Movement → `/manage/[id]/movement`, Download USEBIO → `/manage/[id]/download-usebio`, Delete Game → `/manage/[id]/delete-game`
    - Click each button, assert URL matches expected path
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 7. Create `tests/change-status.spec.ts`
  - [x] 7.1 Verify change-status page displays three status options for a CREATED game
    - Use director fixture, navigate to change-status, assert "Created", "Open for Players", "Complete" visible
    - _Requirements: 4.1_

  - [x] 7.2 Verify active status is visually distinguished
    - Assert the currently active status has a distinguishing attribute (aria-current, selected class, etc.)
    - _Requirements: 4.4_

  - [x] 7.3 Test tapping "Open for Players" transitions status and navigates back to menu
    - Click "Open for Players", assert redirect to `/manage/[id]/menu`
    - _Requirements: 4.2_

  - [x] 7.4 Test tapping "Complete" on a JOINABLE game updates status
    - First transition to JOINABLE via API, navigate to change-status, click "Complete", verify API response
    - _Requirements: 4.3_

- [x] 8. Create `tests/delete-game.spec.ts`
  - [x] 8.1 Verify delete page shows confirmation message with game event name
    - Use director fixture, navigate to delete-game, assert confirmation text includes event name
    - _Requirements: 5.1_

  - [x] 8.2 Test "Cancel" navigates back to `/manage/[id]/menu`
    - Click cancel, assert URL
    - _Requirements: 5.3_

  - [x] 8.3 Test "Yes, Delete Game" calls DELETE API and redirects to `/manage/select-game`
    - Click delete button, assert redirect to select-game
    - _Requirements: 5.2_

  - [x] 8.4 Test error display when delete API fails
    - Intercept DELETE route with 500 response, click delete, assert error message visible
    - _Requirements: 5.4_

- [x] 9. Create `tests/correct-result.spec.ts`
  - [x] 9.1 Verify correct-result page loads and shows board number buttons (or empty state)
    - Use director fixture, navigate to correct-result, assert page renders without error
    - _Requirements: 6.1_

  - [x] 9.2 Test board selection loads traveller view (with route intercept to provide mock board data)
    - Intercept boards API to return mock data, click board button, assert traveller view renders
    - _Requirements: 6.2_

  - [x] 9.3 Test selecting a traveller line shows contract entry panel with board number in header
    - Click a line in the traveller, assert contract panel visible with board number text
    - _Requirements: 6.3_

  - [x] 9.4 Test submitting override calls API with correct payload
    - Intercept override API, fill contract form, submit, assert request was made with roundNumber, tableNumber, boardNumber, result
    - _Requirements: 6.4_

  - [x] 9.5 Test error response returns wizard to board selection
    - Intercept override API with error response, submit, assert wizard returns to board selection step and error message visible
    - _Requirements: 6.5_

- [x] 10. Create `tests/download-usebio.spec.ts`
  - [x] 10.1 Verify download-usebio page renders Club Name and EBU Club Number fields
    - Use director fixture, navigate to download-usebio, assert both fields visible
    - _Requirements: 10.1_

  - [x] 10.2 Test filling club details and tapping "Download USEBIO" calls the API
    - Fill fields, intercept USEBIO API, click download, assert request made
    - _Requirements: 10.2_

  - [x] 10.3 Test error display when USEBIO generation fails
    - Intercept USEBIO route with error, submit, assert error message visible
    - _Requirements: 10.3_

  - [x] 10.4 Test "Cancel" navigates back to `/manage/[id]/menu`
    - Click cancel, assert URL
    - _Requirements: 10.4_

- [x] 11. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Create `tests/movement.spec.ts`
  - [x] 12.1 Verify movement page shows "No movement set up yet." for a game without a movement
    - Use director fixture (game has no movement by default), navigate, assert empty state text
    - _Requirements: 9.2_

  - [x] 12.2 Test movement API endpoint returns valid JSON for an existing game
    - Call `GET /api/games/[gameId]/movement` via request context, assert 200 + JSON
    - _Requirements: 9.3_

  - [x] 12.3 Verify movement page renders table data when movement exists (route intercept)
    - Intercept movement API with mock data, navigate, assert table elements rendered
    - _Requirements: 9.1_

- [x] 13. Create `tests/timer.spec.ts`
  - [x] 13.1 Verify director timer page renders without errors
    - Use director fixture, navigate to `/manage/[id]/timer`, assert page loads
    - _Requirements: 7.1_

  - [x] 13.2 Verify player timer page renders without errors
    - Use game fixture with joinable status, navigate to `/join/[gameId]/timer`, assert page loads
    - _Requirements: 7.2_

  - [x] 13.3 Verify timer shows appropriate initial/empty state
    - Assert empty state content visible when no timer configured
    - _Requirements: 7.3_

- [x] 14. Create `tests/leaderboard.spec.ts`
  - [x] 14.1 Verify leaderboard page renders without errors
    - Use game fixture with joinable status, navigate to `/join/[gameId]/leaderboard`, assert page loads
    - _Requirements: 8.1_

  - [x] 14.2 Test leaderboard API returns valid JSON
    - Call `GET /api/games/[gameId]/leaderboard` via request context, assert response is JSON
    - _Requirements: 8.2_

- [x] 15. Create `tests/play.spec.ts`
  - [x] 15.1 Verify play page renders round info for a valid game and seat (route intercept for schedule data)
    - Intercept schedule API with mock data, navigate to `/play/[gameId]/1NS`, assert round number, table number, board numbers visible
    - _Requirements: 11.1_

  - [x] 15.2 Test "Enter Round" button displays contract entry panel
    - Click "Enter Round", assert contract entry panel visible
    - _Requirements: 11.2_

  - [x] 15.3 Test contract submission transitions to "Waiting for Confirmation" state (route intercept)
    - Intercept submit API, fill and submit contract, assert waiting state visible
    - _Requirements: 11.3_

  - [x] 15.4 Test mismatch screen display (route intercept for mismatch response)
    - Intercept with mismatch response, assert mismatch screen visible with both results
    - _Requirements: 11.4_

- [x] 16. Expand existing `tests/api.spec.ts`
  - [x] 16.1 Add test: `GET /api/players/search?q=test` returns valid JSON with results array
    - _Requirements: 12.1_

  - [x] 16.2 Add test: `GET /api/movements/teams/2` returns valid JSON array of movement options
    - _Requirements: 12.2_

  - [x] 16.3 Add test: `GET /api/movements/detail/pairs/[id]` returns valid JSON with movement detail (use an ID from the pairs/2 response)
    - _Requirements: 12.3_

  - [x] 16.4 Add test: `GET /api/games/[gameId]/usebio` returns XML or error for non-existent game
    - _Requirements: 12.4_

  - [x] 16.5 Add test: `POST /api/system/restart` returns a response
    - _Requirements: 12.5_

- [x] 17. Expand existing `tests/navigation.spec.ts`
  - [x] 17.1 Add test: back navigation from `/settings/wifi` to settings menu
    - Navigate to wifi settings, click back/home control, assert URL is `/settings`
    - _Requirements: 13.1_

  - [x] 17.2 Add test: back navigation from `/settings/club` to settings menu
    - Navigate to club settings, click "Back", assert URL is `/settings`
    - _Requirements: 13.2_

  - [x] 17.3 Add test: back navigation from movement page to director menu
    - Use director fixture, navigate to movement, click "Back", assert URL is `/manage/[id]/menu`
    - _Requirements: 13.3_

  - [x] 17.4 Add test: change-status page navigates back to director menu after status change
    - Use director fixture, change status, assert redirect to `/manage/[id]/menu`
    - _Requirements: 13.4_

- [x] 18. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- All tests use TypeScript and follow the project's Playwright conventions (role-based locators, web-first assertions, no `waitForTimeout`)
- Tests requiring game data that can't be created via REST use `page.route()` interception to mock responses
- The game fixture creates a unique game per test invocation to avoid cross-test interference
- The `director-fixture` builds on `game-fixture` — both must be created before dependent tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "16.1", "16.2", "16.3", "16.4", "16.5"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3", "3.4", "3.5", "4.1", "4.2", "4.3", "4.4", "6.1", "6.2", "7.1", "7.2", "7.3", "7.4", "8.1", "8.2", "8.3", "8.4"] },
    { "id": 3, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5", "10.1", "10.2", "10.3", "10.4", "12.1", "12.2", "12.3", "13.1", "13.2", "13.3", "14.1", "14.2", "15.1", "15.2", "15.3", "15.4"] },
    { "id": 4, "tasks": ["17.1", "17.2", "17.3", "17.4"] }
  ]
}
```
