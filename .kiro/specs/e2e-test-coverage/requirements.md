# Requirements Document

## Introduction

This specification defines comprehensive E2E Playwright test coverage for the Bridge Box Scorer application. The goal is to fill gaps in the existing test suite and deepen coverage of already-tested areas. The document also identifies places where the current UI does not provide a way to set up the test data needed to exercise certain features, which limits purely UI-driven test automation.

## Glossary

- **Test_Suite**: The collection of Playwright E2E test files located in the `tests/` directory
- **Application**: The Bridge Box Scorer Next.js application running at localhost:3000
- **Director**: An authenticated user who manages bridge game sessions (creates games, changes status, overrides results)
- **Player**: A user who joins a game and submits board results during play
- **Game**: A bridge event instance with an associated movement, participants, and board results
- **Socket.IO**: The real-time WebSocket library used for game creation, result submission, and participant management
- **Director_Token**: A JWT-style token stored in localStorage that authenticates director actions for a specific game
- **Movement**: The schedule that determines which pairs sit at which tables each round
- **Traveller**: A record showing all results for a particular board across different tables
- **USEBIO**: An XML standard for reporting bridge results to national organisations
- **Seat**: A player position identifier (e.g. "1NS", "2EW") that determines their schedule

## Requirements

### Requirement 1: Game Creation E2E Tests

**User Story:** As a test author, I want E2E tests that verify the full game creation flow, so that regressions in game setup are detected.

#### Acceptance Criteria

1. WHEN the user navigates to `/create` and fills in Event Name, Director Name, Event Type, and Tables, THE Test_Suite SHALL verify that the form fields accept and retain the entered values.
2. WHEN the user submits the create game form, THE Test_Suite SHALL verify that the Application creates a game via Socket.IO and redirects to `/create/[id]`.
3. IF the Socket.IO connection is unavailable during game creation, THEN THE Test_Suite SHALL verify that the Application displays an error message to the user.
4. WHEN a game is created with Event Type set to "Pairs", THE Test_Suite SHALL verify the game appears in the `/api/games/all` response with `gameType: "PAIRS"`.
5. WHEN a game is created with Event Type set to "Individual", THE Test_Suite SHALL verify the game appears in the `/api/games/all` response with `gameType: "INDIVIDUAL"`.

### Requirement 2: Join Game Flow E2E Tests

**User Story:** As a test author, I want E2E tests that cover the full player join flow from game selection through seat assignment, so that the join path is regression-tested.

#### Acceptance Criteria

1. WHEN a joinable game exists and the user navigates to `/join/select-game`, THE Test_Suite SHALL verify that the game card is visible with the event name displayed.
2. WHEN the user taps a game card on the select-game page, THE Test_Suite SHALL verify that the Application navigates to `/join/[gameId]/menu`.
3. WHEN the user is on the join menu page, THE Test_Suite SHALL verify that "Join As Player", "Show Timer", and "Show Leaderboard" buttons are visible.
4. WHEN the user taps "Join As Player" on the join menu, THE Test_Suite SHALL verify that the Application navigates to `/join/[gameId]/player`.
5. WHEN the user is on the player page, THE Test_Suite SHALL verify that seat selection options are rendered (either pair seats or individual seats depending on game type).

### Requirement 3: Director Menu and Sub-Page E2E Tests

**User Story:** As a test author, I want E2E tests that verify the director management menu and navigation to each sub-page, so that the director workflow is regression-tested.

#### Acceptance Criteria

1. WHEN a game exists and the director has a valid director token, THE Test_Suite SHALL verify that navigating to `/manage/[id]/menu` renders all six menu buttons: Timer, Travellers, Change Status, Movement, Download USEBIO, and Delete Game.
2. WHEN the director taps the "Timer" button on the director menu, THE Test_Suite SHALL verify navigation to `/manage/[id]/timer`.
3. WHEN the director taps the "Travellers" button on the director menu, THE Test_Suite SHALL verify navigation to `/manage/[id]/correct-result`.
4. WHEN the director taps the "Change Status" button on the director menu, THE Test_Suite SHALL verify navigation to `/manage/[id]/change-status`.
5. WHEN the director taps the "Movement" button on the director menu, THE Test_Suite SHALL verify navigation to `/manage/[id]/movement`.
6. WHEN the director taps the "Download USEBIO" button on the director menu, THE Test_Suite SHALL verify navigation to `/manage/[id]/download-usebio`.
7. WHEN the director taps the "Delete Game" button on the director menu, THE Test_Suite SHALL verify navigation to `/manage/[id]/delete-game`.

### Requirement 4: Change Game Status E2E Tests

**User Story:** As a test author, I want E2E tests for the change status page, so that status transitions are verified end-to-end.

#### Acceptance Criteria

1. WHEN the change-status page loads for a game with status "CREATED", THE Test_Suite SHALL verify that three status options are displayed: "Created", "Open for Players", and "Complete".
2. WHEN the director taps "Open for Players" on a game with status "CREATED", THE Test_Suite SHALL verify that the API call succeeds and the Application navigates back to the director menu.
3. WHEN the director taps "Complete" on a game with status "JOINABLE", THE Test_Suite SHALL verify that the game status updates to "COMPLETE" via the API.
4. THE Test_Suite SHALL verify that the currently active status is visually distinguished from the other status options.

### Requirement 5: Delete Game E2E Tests

**User Story:** As a test author, I want E2E tests for the delete game flow, so that deletion is verified including the confirmation step.

#### Acceptance Criteria

1. WHEN the delete-game page loads, THE Test_Suite SHALL verify that a confirmation message is displayed with the game event name.
2. WHEN the director taps "Yes, Delete Game", THE Test_Suite SHALL verify that the DELETE API call is made and the Application redirects to `/manage/select-game`.
3. WHEN the director taps "Cancel" on the delete page, THE Test_Suite SHALL verify navigation back to `/manage/[id]/menu`.
4. IF the delete API returns an error, THEN THE Test_Suite SHALL verify that an error message is displayed on the page.

### Requirement 6: Correct Result Wizard E2E Tests

**User Story:** As a test author, I want E2E tests for the correct-result wizard, so that the multi-step override flow is regression-tested.

#### Acceptance Criteria

1. WHEN the correct-result page loads for a game with boards, THE Test_Suite SHALL verify that board number buttons are displayed for selection.
2. WHEN the director selects a board number, THE Test_Suite SHALL verify that the traveller view loads with board instances (round/table combinations).
3. WHEN the director selects a line from the traveller view, THE Test_Suite SHALL verify that the contract entry panel is displayed with header text including the board number.
4. WHEN the director enters a valid contract and result, THE Test_Suite SHALL verify that the override API call is made with the correct roundNumber, tableNumber, boardNumber, and result.
5. IF the override API returns an error, THEN THE Test_Suite SHALL verify that an error message is shown and the wizard returns to the board selection step.

### Requirement 7: Timer Pages E2E Tests

**User Story:** As a test author, I want E2E tests for both the director timer controls and the player-facing timer display, so that timer functionality is regression-tested.

#### Acceptance Criteria

1. WHEN the director navigates to `/manage/[id]/timer`, THE Test_Suite SHALL verify that the timer controls page renders without errors.
2. WHEN a player navigates to `/join/[gameId]/timer`, THE Test_Suite SHALL verify that the timer display page renders without errors.
3. WHILE a game has no timer configured, THE Test_Suite SHALL verify that the timer page shows an appropriate empty or initial state.

### Requirement 8: Leaderboard Page E2E Tests

**User Story:** As a test author, I want E2E tests for the leaderboard display, so that score presentation is regression-tested.

#### Acceptance Criteria

1. WHEN a player navigates to `/join/[gameId]/leaderboard`, THE Test_Suite SHALL verify that the leaderboard page renders without errors.
2. THE Test_Suite SHALL verify that the leaderboard API endpoint (`/api/games/[gameId]/leaderboard`) returns valid JSON for an existing game.

### Requirement 9: Movement Detail View E2E Tests

**User Story:** As a test author, I want E2E tests for the movement detail page, so that movement table display is regression-tested.

#### Acceptance Criteria

1. WHEN the director navigates to `/manage/[id]/movement` for a game with a movement set, THE Test_Suite SHALL verify that the movement detail view renders table data.
2. WHILE a game has no movement configured, THE Test_Suite SHALL verify that the movement page shows "No movement set up yet."
3. THE Test_Suite SHALL verify that the movement API endpoint (`/api/games/[gameId]/movement`) returns valid JSON for an existing game.

### Requirement 10: Download USEBIO E2E Tests

**User Story:** As a test author, I want E2E tests for the USEBIO download page, so that the download flow is regression-tested.

#### Acceptance Criteria

1. WHEN the director navigates to `/manage/[id]/download-usebio`, THE Test_Suite SHALL verify that the Club Name and EBU Club Number fields are rendered.
2. WHEN the director fills in club details and taps "Download USEBIO", THE Test_Suite SHALL verify that the Application calls the USEBIO API endpoint.
3. IF the USEBIO generation fails, THEN THE Test_Suite SHALL verify that an error message is displayed.
4. WHEN the director taps "Cancel" on the download page, THE Test_Suite SHALL verify navigation back to `/manage/[id]/menu`.

### Requirement 11: Play Flow E2E Tests

**User Story:** As a test author, I want E2E tests for the active game play flow, so that the contract entry, result entry, and round progression are regression-tested.

#### Acceptance Criteria

1. WHEN a player navigates to `/play/[gameId]/[seat]` for a valid game and seat, THE Test_Suite SHALL verify that the round info page is displayed showing the round number, table number, and board numbers.
2. WHEN the player taps "Enter Round", THE Test_Suite SHALL verify that the contract entry panel is displayed.
3. WHEN the player submits a contract and result, THE Test_Suite SHALL verify that the Application transitions to the "Waiting for Confirmation" state.
4. IF a board mismatch occurs between NS and EW submissions, THEN THE Test_Suite SHALL verify that the mismatch screen is displayed with both results shown.

### Requirement 12: API Coverage Gap Tests

**User Story:** As a test author, I want E2E tests for untested API endpoints, so that API regressions are detected.

#### Acceptance Criteria

1. THE Test_Suite SHALL verify that `GET /api/players/search?q=...` returns valid JSON with a results array.
2. THE Test_Suite SHALL verify that `GET /api/movements/teams/[tables]` returns valid JSON with an array of movement options.
3. THE Test_Suite SHALL verify that `GET /api/movements/detail/[type]/[id]` returns valid JSON with movement detail data.
4. THE Test_Suite SHALL verify that `GET /api/games/[gameId]/usebio` returns XML content or an appropriate error for a non-existent game.
5. THE Test_Suite SHALL verify that `POST /api/system/restart` returns a response (success or error depending on environment).

### Requirement 13: Navigation Back-Button Tests

**User Story:** As a test author, I want E2E tests that verify back-navigation from sub-pages, so that users are not stranded on dead-end pages.

#### Acceptance Criteria

1. WHEN the user is on `/settings/wifi` and taps a back or home control, THE Test_Suite SHALL verify navigation back to the settings menu.
2. WHEN the user is on `/settings/club` and taps "Back", THE Test_Suite SHALL verify navigation back to the settings menu.
3. WHEN the director is on the movement page and taps "Back", THE Test_Suite SHALL verify navigation back to `/manage/[id]/menu`.
4. WHEN the director is on the change-status page and status is changed, THE Test_Suite SHALL verify navigation back to `/manage/[id]/menu`.

### Requirement 14: Manage Select Game and Director Claim Code Tests

**User Story:** As a test author, I want E2E tests for the manage game selection page including the director claim code flow, so that the management entry point is regression-tested.

#### Acceptance Criteria

1. WHEN a game exists and the user navigates to `/manage/select-game`, THE Test_Suite SHALL verify that the game card is displayed with the event name.
2. WHEN the user taps a game card and does not have a director token for that game, THE Test_Suite SHALL verify that the claim director code screen is displayed.
3. WHEN the user enters a valid director code, THE Test_Suite SHALL verify that the Application navigates to `/manage/[id]/menu`.
4. WHEN the user taps "Cancel" on the claim code screen, THE Test_Suite SHALL verify that the Application returns to the game list.

## UI Data Setup Gaps Analysis

The following gaps have been identified where the current UI does not provide adequate mechanisms to create or seed the test data needed for testing:

### Gap 1: Game Creation Requires Socket.IO

The game creation form submits via Socket.IO (`emitWithAck` on the `create-game` event), not a REST API call. Playwright cannot natively interact with Socket.IO. Tests must either:
- Execute the form submission and rely on the client-side Socket.IO connection working in the test browser
- Use a REST API endpoint for game creation (none currently exists)
- Seed the database directly

**Impact:** Tests that require an existing game (join flow, director menu, play flow, change status, delete, correct result, movement, USEBIO) all depend on being able to create a game first.

### Gap 2: No REST API for Adding Players/Participants

Player/participant creation uses Socket.IO (`game:createParticipant` event). The UI provides seat selection but the actual participant creation goes through Socket.IO. There is no REST endpoint for registering participants.

**Impact:** Tests for the play flow, leaderboard, and board results require participants to be assigned to seats before the flow can begin.

### Gap 3: Board Result Submission Requires Socket.IO

Submitting a board result during play uses `socket.emit(SocketEvents.SUBMIT_RESULT, ...)`. The only REST-based result entry is the director override endpoint (`POST /api/games/[gameId]/boards/[boardNumber]/override`), which requires director authentication.

**Impact:** Tests that need scored boards (leaderboard with real data, traveller views with existing results, USEBIO download with results) cannot create that data purely through REST APIs without director authentication.

### Gap 4: Movement Selection Requires Socket.IO

Selecting a movement for a game uses `emitEvent(SocketEvents.SELECT_MOVEMENT, ...)`. There is no REST API endpoint for movement selection.

**Impact:** Tests for the movement detail view, correct-result wizard (which shows boards based on movement), and the play flow (which needs a schedule derived from the movement) all require a movement to be set first.

### Gap 5: Game Status Changes Require Director Token from Game Creation

The director token is returned during game creation via Socket.IO and stored in localStorage. The `POST /api/games/[gameId]/status` endpoint requires this token. While there is a `game:claimDirectorCode` socket event, there is no REST API to claim directorship of a game.

**Impact:** Tests for change-status, delete-game, correct-result override, and USEBIO download all require a valid director token. If the game is created via the UI form (which stores the token in localStorage), the token is available to subsequent page navigations in the same browser context.

### Gap 6: Timer Configuration Requires Socket.IO

Timer creation and management (`timer:create`, `timer:start`, `timer:pause`, `timer:nextRound`) all use Socket.IO events. There is no REST API for timer management.

**Impact:** Tests for the timer display page cannot show meaningful timer state without first configuring a timer via Socket.IO.

### Recommended Test Strategy

Given these gaps, the recommended approach for E2E tests is:
1. **Create games via the UI form** — the Socket.IO connection works in the browser during E2E tests, and the director token is stored in localStorage automatically
2. **Use the director override API** (REST) for seeding board results where needed, using the director token from localStorage
3. **Use the change-status API** (REST) for setting game status to JOINABLE
4. **Accept that some flows (play, participants, movement, timer) cannot be fully tested without Socket.IO interaction** — these tests should focus on page rendering and partial flows rather than complete end-to-end scenarios
5. **Consider adding a test-only REST API** (behind an environment flag) for seeding game state in the test environment
