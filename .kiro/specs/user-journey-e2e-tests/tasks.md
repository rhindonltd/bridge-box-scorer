# Implementation Plan: User Journey E2E Tests

## Overview

Add two Playwright projects (`journeys-phone` and `journeys-tablet`) with extended timeouts and mobile device emulation, a shared helpers module for multi-step operations, and 10 journey test files covering complete user workflows. Infrastructure (config + helpers) is built first, then journey files are created in parallel batches.

## Tasks

- [x] 1. Set up journey test infrastructure
  - [x] 1.1 Add `journeys-phone` and `journeys-tablet` projects to `playwright.config.ts`
    - Add two project entries: `"journeys-phone"` (iPhone 12) and `"journeys-tablet"` (Amazon Fire HD 8 custom config with viewport 800×1280, deviceScaleFactor 1.5, hasTouch, isMobile, Silk UA)
    - Both projects share `testDir: "./tests/journeys"`
    - Configure `timeout: 120_000`, `expect: { timeout: 15_000 }`, `fullyParallel: false` on both
    - `journeys-phone` uses `...devices["iPhone 12"]` for mobile viewport emulation
    - `journeys-tablet` uses custom viewport/UA config for Amazon Fire HD 8
    - Set `trace: "on-first-retry"` and `screenshot: "only-on-failure"` on both
    - Add convenience scripts to `package.json`: `"journey:phone"`, `"journey:tablet"`, `"journey:all"`
    - Reuse existing `webServer` config (no changes needed there)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_

  - [x] 1.2 Create shared helpers module at `tests/journeys/helpers.ts`
    - Implement `attachScreenshot(page, testInfo, name)` — wraps `page.screenshot()` + `testInfo.attach()`
    - Implement `createGameStep(page, testInfo, options)` — fills `/create` form, extracts gameId and directorToken
    - Implement `selectMovementStep(page, testInfo, gameId, movementName)` — selects movement on `/create/[id]`
    - Implement `makeGameJoinableStep(page, testInfo, gameId)` — transitions game to JOINABLE via `/manage/[id]/change-status`
    - Implement `joinGameStep(page, testInfo, gameId, options)` — navigates to `/join/select-game`, selects game, picks seat, enters player names
    - Implement `enterResultStep(page, testInfo, options)` — navigates to play page, enters contract result for a board
    - Implement `cleanupGames(baseURL)` — fetches all games via API, deletes those prefixed with "E2E Journey"
    - Each helper wraps logic in `test.step()` for HTML report readability
    - **Multi-actor contexts must use `test.info().project.use` for device settings** — `browser.newContext()` does NOT auto-inherit project `use` config; tests must pass `test.info().project.use` as the context options so the same test code adapts to phone or tablet project
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 14.6, 15.1, 15.2_

- [x] 2. Checkpoint - Verify infrastructure
  - Ensure `npx playwright test --project=journeys-phone --project=journeys-tablet --list` lists both projects without errors, ask the user if questions arise.

- [x] 3. Implement core game journey tests
  - [x] 3.1 Create `tests/journeys/game-lifecycle.journey.ts`
    - Create director context, 2 player contexts using `browser.newContext(test.info().project.use)` to inherit phone/tablet device settings
    - Use `test.beforeAll` / `test.afterAll` with `cleanupGames()`
    - Test: "Complete pairs game lifecycle" — create game → select Mitchell → make joinable → players join seats → enter matching results → verify confirmation → check leaderboard → complete game
    - Use `try/finally` to close all contexts
    - Attach screenshots at each key moment
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 2.1, 2.2, 2.3, 2.4, 14.1, 14.2, 14.5, 15.3, 15.4_

  - [x] 3.2 Create `tests/journeys/result-entry.journey.ts`
    - Set up game with NS + EW players at the same table
    - Test: "NS and EW enter matching results and see confirmation" — NS enters result → EW enters same result → both see confirmation → board marked as played
    - Attach screenshots of result entry UI and confirmation state
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 14.3, 14.4_

  - [x] 3.3 Create `tests/journeys/result-mismatch.journey.ts`
    - Set up game with NS + EW players at the same table
    - Test: "Conflicting results trigger mismatch flow" — NS enters "3NT North making" → EW enters "4H South +1" → both see mismatch screen → director resolves via correct-result wizard
    - Attach screenshots of mismatch state and director correction
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 4. Implement director management journey tests
  - [x] 4.1 Create `tests/journeys/director-correction.journey.ts`
    - Navigate director to `/manage/[id]/correct-result`
    - Test: "Director corrects a result via traveller view" — select board → view traveller with participants → select instance → enter new result → verify API payload → verify traveller updates
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 4.2 Create `tests/journeys/timer-management.journey.ts`
    - Director and player contexts for timer sync validation
    - Test: "Timer creation, control, and player display" — configure timer → start → verify director countdown → verify player countdown (±2s) → pause → verify paused state → resume → verify resumed
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 4.3 Create `tests/journeys/game-status.journey.ts`
    - Director and player contexts
    - Test: "Game status transitions affect joinable list" — create game → verify appears in joinable list → change to COMPLETE → verify disappears from joinable list
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 4.4 Create `tests/journeys/game-deletion.journey.ts`
    - Director and player contexts
    - Test: "Game deletion with confirmation and verification" — navigate to delete page → verify confirmation message → confirm deletion → verify redirect → verify API no longer returns game → verify removed from joinable list
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 5. Implement settings and export journey tests
  - [x] 5.1 Create `tests/journeys/settings.journey.ts`
    - Test: "Settings PIN gate, WiFi config, and club info" — navigate to WiFi settings → enter PIN → verify page loads → navigate to club settings → enter PIN → fill club name/EBU number → save → reload → verify persistence
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 5.2 Create `tests/journeys/usebio-download.journey.ts`
    - Set up club info via API, create completed game with results
    - Test: "USEBIO XML download with club data" — set club info → navigate to download page → verify pre-populated fields → click download → intercept response → verify XML content type → verify XML includes event name and club details
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 5.3 Create `tests/journeys/movement-selection.journey.ts`
    - Director and player contexts
    - Test: "Movement selection and player schedule display" — create game with 2+ tables → navigate to movement page → verify available movements → select Mitchell → verify round assignments → player joins → verify player sees matching schedule
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 6. Final checkpoint - Ensure all journey tests pass
  - Run `npx playwright test --project=journeys-phone --project=journeys-tablet` and ensure all tests pass, ask the user if questions arise.

## Notes

- No property-based tests are applicable — all requirements describe integration-level user flows
- Each journey file is self-contained with `beforeAll`/`afterAll` cleanup hooks
- All test games use the `"E2E Journey"` event name prefix for targeted cleanup
- Screenshots are attached with descriptive names for HTML report readability
- Tests use `{ browser }` fixture (not `{ page }`) to create multiple actor contexts
- Multi-actor contexts use `test.info().project.use` to inherit device settings — do NOT manually spread `devices["iPhone 12"]` in test code
- The same test code runs under both `journeys-phone` and `journeys-tablet` projects without changes
- Socket.IO synchronisation relies on Playwright's auto-waiting assertions, not artificial delays

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3", "4.4"] },
    { "id": 4, "tasks": ["5.1", "5.2", "5.3"] }
  ]
}
```
