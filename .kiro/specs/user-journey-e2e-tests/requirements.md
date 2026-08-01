# Requirements Document

## Introduction

Comprehensive user journey end-to-end tests for the Bridge Box Scorer application. These tests use multi-browser-context Playwright with `test.step()` for readable HTML reports. Each journey is a complete narrative covering a realistic user workflow, exercising the full stack including Socket.IO, database, and UI interactions across multiple actors (director, players).

## Glossary

- **Journey_Test**: A Playwright test file in `tests/journeys/` that exercises a complete, realistic user workflow from start to finish across one or more actors
- **Actor**: A distinct browser context representing a user role (director or player) in a journey test
- **Director**: The user who creates and manages a bridge game session via `/create` and `/manage/[id]/*` routes
- **Player**: A user who joins a game via `/join/[gameId]/*` routes and enters results via `/play/[gameId]/[seat]`
- **Test_Runner**: The Playwright test framework configured with a dedicated `journeys` project
- **Bridge_Box_Scorer**: The Next.js application under test, running on `localhost:3000`
- **Journey_Project**: A separate Playwright project configuration for journey tests with extended timeouts
- **Database**: The SQLite database file used by the application to persist game state
- **HTML_Report**: The Playwright HTML reporter output consumed by non-technical stakeholders
- **test.step()**: The Playwright method used to annotate meaningful user actions in the HTML report

## Requirements

### Requirement 1: Journey Test Infrastructure

**User Story:** As a developer, I want a dedicated Playwright project for journey tests, so that long-running multi-actor tests run with appropriate timeouts and configuration separate from unit-style E2E tests.

#### Acceptance Criteria

1. THE Test_Runner SHALL include a `journeys` project in `playwright.config.ts` with `testDir` set to `./tests/journeys`
2. THE Journey_Project SHALL configure an action timeout of at least 30 seconds per step
3. THE Journey_Project SHALL configure a test timeout of at least 120 seconds per test
4. THE Journey_Project SHALL use a single browser type (Chromium) for consistent multi-context behaviour
5. THE Journey_Project SHALL use the HTML reporter for generating stakeholder-readable output
6. WHEN a journey test file begins execution, THE Test_Runner SHALL ensure the database is in a clean state by deleting any games created during previous test runs
7. THE Journey_Project SHALL reuse the existing `webServer` configuration to start the application on `localhost:3000`

### Requirement 2: Multi-Actor Browser Context

**User Story:** As a developer, I want each actor in a journey test to have an isolated browser context, so that director and player sessions do not share cookies, localStorage, or Socket.IO connections.

#### Acceptance Criteria

1. WHEN a journey test requires multiple actors, THE Test_Runner SHALL create a separate `browser.newContext()` for each actor
2. THE Test_Runner SHALL create a new `page` from each actor context for independent navigation
3. WHEN a journey test completes, THE Test_Runner SHALL close all actor contexts to release resources
4. THE Test_Runner SHALL allow at least 4 concurrent browser contexts within a single test (1 director + 3 player contexts)

### Requirement 3: Test Step Annotation

**User Story:** As a non-technical stakeholder, I want the HTML report to show readable steps for each meaningful user action, so that I can understand what the test validated without reading code.

#### Acceptance Criteria

1. THE Journey_Test SHALL wrap each meaningful user action in a `test.step()` call with a descriptive name
2. THE Journey_Test SHALL use step names that describe the user intent (e.g., "Director creates a new pairs game with 3 tables")
3. THE Journey_Test SHALL capture a screenshot at key validation points within steps using `page.screenshot()`
4. WHEN a step fails, THE HTML_Report SHALL display the step name and the screenshot taken at the point of failure

### Requirement 4: Complete Pairs Game Journey

**User Story:** As a developer, I want a journey test covering the full pairs game lifecycle, so that the entire director-to-player-to-results flow is validated end-to-end.

#### Acceptance Criteria

1. THE Journey_Test SHALL create a game via the `/create` form with an event name, director name, and at least 2 tables
2. WHEN the game is created, THE Journey_Test SHALL verify the redirect to `/create/[id]` and extract the game ID
3. THE Journey_Test SHALL select a Mitchell movement for the game on the movement selection page
4. THE Journey_Test SHALL transition the game status to JOINABLE via the `/manage/[id]/change-status` page
5. WHEN the game is JOINABLE, THE Journey_Test SHALL open at least 2 player contexts that each navigate to `/join/select-game` and select the game
6. THE Journey_Test SHALL have each player context join at a different seat via `/join/[gameId]/player`
7. THE Journey_Test SHALL have at least one pair of players enter matching results for a board via `/play/[gameId]/[seat]`
8. WHEN both sides submit the same result, THE Journey_Test SHALL verify both players see the confirmation state
9. THE Journey_Test SHALL verify the leaderboard at `/join/[gameId]/leaderboard` displays updated scores after results are confirmed
10. THE Journey_Test SHALL transition the game to COMPLETE status via the director context

### Requirement 5: Result Entry and Confirmation Journey

**User Story:** As a developer, I want a journey test validating that both NS and EW sides at a table can enter matching results and see confirmation, so that the core scoring flow is verified.

#### Acceptance Criteria

1. THE Journey_Test SHALL set up a game with players seated at opposing sides of the same table
2. THE Journey_Test SHALL have the NS player context navigate to the play page and enter a contract result for Board 1
3. THE Journey_Test SHALL have the EW player context navigate to the play page and enter the same contract result for Board 1
4. WHEN both sides submit matching results, THE Journey_Test SHALL verify both player contexts transition from "Waiting for confirmation" to a confirmed state
5. THE Journey_Test SHALL verify the board status changes to played in the round schedule

### Requirement 6: Result Mismatch Journey

**User Story:** As a developer, I want a journey test covering the mismatch scenario, so that the conflict resolution flow between players and director is validated.

#### Acceptance Criteria

1. THE Journey_Test SHALL set up a game with two player contexts seated at opposing sides of the same table
2. THE Journey_Test SHALL have the NS player enter one contract result (e.g., "3NT North making")
3. THE Journey_Test SHALL have the EW player enter a different contract result (e.g., "4H South +1")
4. WHEN both sides submit conflicting results, THE Journey_Test SHALL verify both player contexts display the mismatch screen showing both submitted results
5. THE Journey_Test SHALL verify the director context can view the mismatched board via the correct-result wizard
6. WHEN the director submits a correction, THE Journey_Test SHALL verify the override is saved and the board is marked as resolved

### Requirement 7: Director Correction Journey

**User Story:** As a developer, I want a journey test covering the director's ability to correct results via the traveller view, so that the override workflow is validated end-to-end.

#### Acceptance Criteria

1. THE Journey_Test SHALL navigate the director context to `/manage/[id]/correct-result`
2. THE Journey_Test SHALL select a board number from the board selection list
3. WHEN a board is selected, THE Journey_Test SHALL verify the traveller view displays all instances of that board with participant names and current results
4. THE Journey_Test SHALL select a specific board instance (row) to open the contract entry panel
5. THE Journey_Test SHALL enter a new contract result via the contract entry UI
6. WHEN the override is submitted, THE Journey_Test SHALL verify the API receives the correct payload including `roundNumber`, `tableNumber`, `result`, and `directorToken`
7. WHEN the override succeeds, THE Journey_Test SHALL verify the traveller view updates to show the corrected result

### Requirement 8: Timer Management Journey

**User Story:** As a developer, I want a journey test covering timer creation, control, and player display, so that the real-time timer synchronisation is validated.

#### Acceptance Criteria

1. THE Journey_Test SHALL navigate the director context to `/manage/[id]/timer`
2. THE Journey_Test SHALL configure the timer with round count and duration values
3. WHEN the director starts the timer, THE Journey_Test SHALL verify the timer displays a countdown in the director context
4. THE Journey_Test SHALL open a player context navigated to `/join/[gameId]/timer`
5. WHEN the player timer page loads, THE Journey_Test SHALL verify it displays the same countdown value as the director (within 2 seconds tolerance)
6. WHEN the director pauses the timer, THE Journey_Test SHALL verify both director and player contexts show the timer as paused
7. WHEN the director resumes the timer, THE Journey_Test SHALL verify both contexts show the timer counting down again

### Requirement 9: Game Status Management Journey

**User Story:** As a developer, I want a journey test verifying game status transitions affect the joinable game list, so that status management is validated from both director and player perspectives.

#### Acceptance Criteria

1. THE Journey_Test SHALL create a game that starts in JOINABLE status after creation
2. THE Journey_Test SHALL verify the game appears in the joinable games list at `/join/select-game` from a player context
3. WHEN the director changes the game status to COMPLETE via `/manage/[id]/change-status`, THE Journey_Test SHALL verify the page redirects back to the director menu
4. WHEN the game is COMPLETE, THE Journey_Test SHALL verify the game no longer appears in the joinable games list at `/join/select-game`

### Requirement 10: Game Deletion Journey

**User Story:** As a developer, I want a journey test verifying the full deletion flow including confirmation and post-deletion state, so that destructive operations are validated.

#### Acceptance Criteria

1. THE Journey_Test SHALL navigate the director context to `/manage/[id]/delete-game`
2. THE Journey_Test SHALL verify the confirmation message displays the game event name
3. WHEN the director clicks "Yes, Delete Game", THE Journey_Test SHALL verify the page redirects to `/manage/select-game`
4. WHEN the game is deleted, THE Journey_Test SHALL verify the game no longer appears in the `/api/games/all` API response
5. WHEN the game is deleted, THE Journey_Test SHALL verify the game no longer appears in the joinable games list at `/join/select-game`

### Requirement 11: Settings Configuration Journey

**User Story:** As a developer, I want a journey test covering the settings flow including PIN entry, WiFi configuration, and club information, so that the admin configuration flow is validated.

#### Acceptance Criteria

1. THE Journey_Test SHALL navigate to `/settings/wifi` and verify the PIN entry gate is displayed
2. WHEN the correct PIN (1234) is entered, THE Journey_Test SHALL verify the WiFi settings page loads with network selector and password field
3. THE Journey_Test SHALL navigate to `/settings/club` and enter the PIN
4. WHEN the club settings page loads, THE Journey_Test SHALL fill in Club Name and EBU Club Number fields
5. WHEN the Save button is clicked, THE Journey_Test SHALL verify the club information persists by reloading the page and checking the field values

### Requirement 12: USEBIO Download Journey

**User Story:** As a developer, I want a journey test covering the USEBIO XML download flow, so that the export functionality is validated with real game data.

#### Acceptance Criteria

1. THE Journey_Test SHALL set up club information via the `/api/system/club` endpoint before navigating to the download page
2. THE Journey_Test SHALL navigate the director context to `/manage/[id]/download-usebio`
3. THE Journey_Test SHALL verify the Club Name and EBU Club Number fields are pre-populated from saved club data
4. WHEN the "Download USEBIO" button is clicked, THE Journey_Test SHALL intercept the download response and verify the content type is `application/xml`
5. THE Journey_Test SHALL verify the downloaded XML content includes the game event name and club details

### Requirement 13: Movement Selection Journey

**User Story:** As a developer, I want a journey test covering the movement selection and display flow, so that the game configuration from director to player schedule is validated.

#### Acceptance Criteria

1. THE Journey_Test SHALL create a game with at least 2 tables via the create form
2. WHEN the game is created, THE Journey_Test SHALL navigate to the movement page at `/create/[id]` or `/manage/[id]/movement`
3. THE Journey_Test SHALL verify available movements are displayed (Mitchell for the configured number of tables)
4. WHEN a Mitchell movement is selected, THE Journey_Test SHALL verify the movement detail page shows round-by-round assignments with table numbers, pair positions (NS/EW), and board ranges
5. THE Journey_Test SHALL open a player context, join the game at a seat, and verify the player sees their round schedule matching the selected movement

### Requirement 14: Screenshot and Report Quality

**User Story:** As a non-technical stakeholder, I want screenshots embedded in the HTML report at key moments, so that I can visually verify the application state during each journey.

#### Acceptance Criteria

1. THE Journey_Test SHALL capture a screenshot after each game creation showing the post-creation page
2. THE Journey_Test SHALL capture a screenshot when players are seated showing the player assignment
3. THE Journey_Test SHALL capture a screenshot of the result entry UI before submission
4. THE Journey_Test SHALL capture a screenshot of the confirmation or mismatch state after result submission
5. THE Journey_Test SHALL capture a screenshot of the leaderboard showing final scores
6. THE Journey_Test SHALL store screenshots with descriptive filenames including the journey name and step description

### Requirement 15: Database Cleanup

**User Story:** As a developer, I want each journey test file to start with a clean database state, so that tests are isolated and repeatable.

#### Acceptance Criteria

1. WHEN a journey test file begins, THE Test_Runner SHALL delete all games created by previous test runs via the `/api/games/all` and `/api/games/[id]/delete` endpoints
2. IF a game deletion fails during cleanup, THEN THE Test_Runner SHALL log the failure and continue with remaining cleanup
3. THE Test_Runner SHALL perform cleanup before the first test in each file using a `test.beforeAll` hook
4. WHEN a journey test file completes, THE Test_Runner SHALL delete any games created during the test using a `test.afterAll` hook
