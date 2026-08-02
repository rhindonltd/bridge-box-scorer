# Design Document: User Journey E2E Tests

## Architecture Overview

The user journey E2E tests add two dedicated Playwright projects (`journeys-phone` and `journeys-tablet`) that run long-form, multi-actor browser tests against the full Bridge Box Scorer stack. Each journey test exercises a complete user workflow — from game creation through result entry and scoring — using real Socket.IO connections, a live SQLite database, and mobile-viewport browser contexts.

The architecture separates journey tests from the existing unit-style E2E tests via distinct Playwright projects with extended timeouts, mobile device emulation (iPhone 12 for phone, Amazon Fire HD 8 for tablet), and a shared helper layer for common multi-step operations. The same test code runs against both device profiles — tests use `test.info().project.use` to inherit the active project's device settings.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         Playwright Test Runner                             │
├──────────────────────┬─────────────────────────┬─────────────────────────┤
│  Existing Projects   │  journeys-phone Project  │  journeys-tablet Project│
│  (webkit, Mobile)    │  device: iPhone 12        │  device: Fire HD 8      │
│  testDir: ./tests    │  viewport: 390×844        │  viewport: 800×1280     │
│                      │  testDir: ./tests/journeys│  testDir: ./tests/journeys│
└──────────────────────┴─────────────────────────┴─────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
              ┌─────▼─────┐  ┌─────▼─────┐  ┌─────▼─────┐
              │  Director  │  │  Player 1  │  │  Player 2  │
              │  Context   │  │  Context   │  │  Context   │
              │(project.use)│ │(project.use)│ │(project.use)│
              └─────┬──────┘  └─────┬──────┘  └─────┬──────┘
                    │               │               │
                    └───────────────┼───────────────┘
                                    │
                    ┌───────────────▼───────────────┐
                    │  Bridge Box Scorer (Next.js)   │
                    │  localhost:3000                 │
                    │  Socket.IO + SQLite             │
                    └────────────────────────────────┘
```

## Components

### 1. Playwright Configuration Extension

Two journey projects are added to the existing `playwright.config.ts` alongside the current projects. They share `testDir` but target different device profiles. Both inherit the `webServer` and `baseURL` settings but override timeouts and device emulation.

```typescript
// Addition to playwright.config.ts projects array
{
  name: "journeys-phone",
  testDir: "./tests/journeys",
  use: {
    ...devices["iPhone 12"],
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
},
{
  name: "journeys-tablet",
  testDir: "./tests/journeys",
  use: {
    viewport: { width: 800, height: 1280 },
    deviceScaleFactor: 1.5,
    hasTouch: true,
    isMobile: true,
    userAgent: "Mozilla/5.0 (Linux; Android 11; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/98.4.1 like Chrome/98.0.4758.136 Mobile Safari/537.36",
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
}
```

Convenience scripts are added to `package.json`:

```json
"journey:phone": "playwright test --project=journeys-phone",
"journey:tablet": "playwright test --project=journeys-tablet",
"journey:all": "playwright test --project=journeys-phone --project=journeys-tablet"
```

Key decisions:
- **Two device profiles** — `journeys-phone` uses iPhone 12 (390×844) for phone-sized validation; `journeys-tablet` uses a custom Amazon Fire HD 8 config (800×1280) for tablet layout validation. Both use Chromium under the hood.
- **Sequential within file** — journey tests within a single file share database state (game created in step 1 is used in later steps), so parallel execution within a file is disabled.
- **Parallel across files** — different journey files are independent and can run in parallel.
- **Chromium only** — multi-context behaviour is most consistent in Chromium; both device configs use Chromium under the hood via `defaultBrowserType`.

### 2. Shared Helpers Module

`tests/journeys/helpers.ts` provides reusable step functions that encapsulate common multi-step operations. Each helper:
- Wraps its logic in `test.step()` for report readability
- Accepts `testInfo` to attach screenshots at key moments
- Returns extracted state (gameId, tokens) for downstream steps

```typescript
import { test, Page, TestInfo, devices } from "@playwright/test";

export async function attachScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string
): Promise<void> {
  await testInfo.attach(name, {
    body: await page.screenshot(),
    contentType: "image/png",
  });
}

export async function createGameStep(
  page: Page,
  testInfo: TestInfo,
  options: { eventName: string; directorName?: string; tables?: number }
): Promise<{ gameId: string; directorToken: string }> {
  return await test.step(
    `Director creates game "${options.eventName}" with ${options.tables ?? 2} tables`,
    async () => {
      await page.goto("/create");
      await page.getByLabel("Event Name").fill(options.eventName);
      await page.getByLabel("Director Name").fill(options.directorName ?? "E2E Director");

      const tables = options.tables ?? 2;
      const incrementButton = page.getByRole("button", { name: "+" });
      for (let i = 1; i < tables; i++) {
        await incrementButton.click();
      }

      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.waitForURL(/\/create\/.+/);

      const gameId = page.url().split("/create/")[1];
      const directorToken = await page.evaluate(
        (gid) => localStorage.getItem(`director:${gid}`),
        gameId
      );

      await attachScreenshot(page, testInfo, "Director - Game created");
      return { gameId, directorToken: directorToken! };
    }
  );
}

export async function selectMovementStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
  movementName: string = "Mitchell"
): Promise<void> {
  return await test.step(
    `Director selects ${movementName} movement`,
    async () => {
      // Already on /create/[id] after game creation
      await page.getByRole("button", { name: new RegExp(movementName, "i") }).click();
      await attachScreenshot(page, testInfo, `Director - ${movementName} movement selected`);
    }
  );
}

export async function makeGameJoinableStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string
): Promise<void> {
  return await test.step("Director makes game joinable", async () => {
    await page.goto(`/manage/${gameId}/change-status`);
    await page.getByRole("button", { name: /start|joinable/i }).click();
    await attachScreenshot(page, testInfo, "Director - Game made joinable");
  });
}

export async function joinGameStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
  options: { seat: string; players: { firstName: string; lastName: string }[] }
): Promise<void> {
  return await test.step(
    `Player joins game at seat ${options.seat}`,
    async () => {
      await page.goto(`/join/select-game`);
      // Select the game from the list
      await page.getByRole("link", { name: new RegExp(gameId.slice(0, 8)) }).click();
      await page.waitForURL(/\/join\/.+\/player/);

      // Select seat and enter player names
      await page.getByRole("button", { name: new RegExp(options.seat, "i") }).click();

      for (const player of options.players) {
        // Fill player name fields as they appear
        const firstNameInput = page.getByLabel(/first/i).first();
        const lastNameInput = page.getByLabel(/last/i).first();
        await firstNameInput.fill(player.firstName);
        await lastNameInput.fill(player.lastName);
      }

      await page.getByRole("button", { name: /confirm|join/i }).click();
      await attachScreenshot(page, testInfo, `Player - Seated at ${options.seat}`);
    }
  );
}

export async function enterResultStep(
  page: Page,
  testInfo: TestInfo,
  options: { gameId: string; seat: string; board: number; passOut?: boolean }
): Promise<void> {
  return await test.step(
    `Player at ${options.seat} enters result for Board ${options.board}`,
    async () => {
      await page.goto(`/play/${options.gameId}/${options.seat}`);
      await page.getByRole("button", { name: "Enter Round" }).click();
      await page.waitForSelector(`text=Board ${options.board}`);

      if (options.passOut) {
        await page.getByRole("button", { name: "Pass Out" }).click();
      }

      await attachScreenshot(page, testInfo, `Player ${options.seat} - Result entered Board ${options.board}`);
      const okButton = page.getByRole("button", { name: "OK" });
      await okButton.dispatchEvent("submit");
    }
  );
}

export async function cleanupGames(baseURL: string): Promise<void> {
  const response = await fetch(`${baseURL}/api/games/all`);
  if (!response.ok) return;
  const games = await response.json();

  for (const game of games) {
    if (game.eventName?.startsWith("E2E Journey")) {
      try {
        await fetch(`${baseURL}/api/games/${game.gameId}/delete`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ directorToken: game.directorToken }),
        });
      } catch {
        console.warn(`Failed to delete game ${game.gameId} during cleanup`);
      }
    }
  }
}
```

### 3. Multi-Actor Context Pattern

Each journey test that involves multiple users creates separate browser contexts that inherit device settings from the active project. This ensures complete isolation of localStorage, cookies, and Socket.IO connections while adapting to whichever device profile (phone or tablet) is running the test.

**Important:** `browser.newContext()` does NOT automatically inherit the project's `use` settings. Tests must explicitly pass them via `test.info().project.use`:

```typescript
import { test, expect } from "@playwright/test";
import { attachScreenshot, createGameStep, cleanupGames } from "./helpers";

test.beforeAll(async () => {
  await cleanupGames("http://localhost:3000");
});

test.afterAll(async () => {
  await cleanupGames("http://localhost:3000");
});

test("Complete pairs game lifecycle", async ({ browser }, testInfo) => {
  // Get device config from the active project (phone or tablet)
  const deviceConfig = test.info().project.use;

  // Director context — inherits project device settings
  const directorContext = await browser.newContext(deviceConfig);
  const directorPage = await directorContext.newPage();

  // Player contexts — same device settings
  const player1Context = await browser.newContext(deviceConfig);
  const player1Page = await player1Context.newPage();

  const player2Context = await browser.newContext(deviceConfig);
  const player2Page = await player2Context.newPage();

  try {
    // ... journey steps using directorPage, player1Page, player2Page ...
  } finally {
    await player2Context.close();
    await player1Context.close();
    await directorContext.close();
  }
});
```

Key design decisions:
- **`test.info().project.use` for device settings** — this is the correct way to inherit the project's device configuration in `browser.newContext()`. The same test code runs identically under `journeys-phone` (iPhone 12) and `journeys-tablet` (Fire HD 8) without any code changes.
- **`browser` fixture** — tests destructure `{ browser }` (not `{ page }`) to get access to `browser.newContext()` for multi-actor scenarios.
- **No manual device spreading** — do NOT use `...devices["iPhone 12"]` directly in tests. The project-level config controls the device; tests just pass `test.info().project.use` to `newContext()`.
- **`try/finally` for cleanup** — contexts are always closed even if the test fails mid-way.
- **No Socket.IO mocking** — the real Socket.IO connection through the browser handles all real-time updates naturally. When Player 1 submits a result, Player 2's page receives the Socket.IO event through the live server.

### 4. Screenshot Strategy

Screenshots are attached to the HTML report using `testInfo.attach()` at key validation moments:

| Moment | Screenshot Name Pattern |
|--------|------------------------|
| After game creation | `"Director - Game created"` |
| After movement selection | `"Director - Mitchell movement selected"` |
| After game made joinable | `"Director - Game made joinable"` |
| After player seated | `"Player - Seated at 1NS"` |
| Before result submission | `"Player 1NS - Result entered Board 1"` |
| Confirmation state | `"Player 1NS - Result confirmed Board 1"` |
| Mismatch state | `"Player 1NS - Mismatch detected Board 1"` |
| Director correction | `"Director - Correction submitted Board 1"` |
| Leaderboard | `"Player - Leaderboard with scores"` |
| Timer running | `"Director - Timer running"` |
| Timer player view | `"Player - Timer display"` |

Each screenshot is named with the actor prefix and the action description, making the HTML report navigable without reading code.

### 5. Database Cleanup Strategy

```typescript
// Cleanup runs in beforeAll and afterAll of each journey test file
test.beforeAll(async () => {
  await cleanupGames("http://localhost:3000");
});

test.afterAll(async () => {
  await cleanupGames("http://localhost:3000");
});
```

The cleanup function:
1. Fetches all games via `GET /api/games/all`
2. Filters for games with event names starting with `"E2E Journey"` (the naming convention for journey test games)
3. Deletes each matching game via `DELETE /api/games/[id]/delete`
4. Catches and logs failures for individual deletions without aborting the cleanup loop

This approach avoids direct database manipulation and exercises the same API endpoints the application uses.

## Interfaces

### Helper Function Signatures

```typescript
// Screenshot attachment
function attachScreenshot(page: Page, testInfo: TestInfo, name: string): Promise<void>;

// Game creation — returns gameId and directorToken
function createGameStep(
  page: Page,
  testInfo: TestInfo,
  options: { eventName: string; directorName?: string; tables?: number }
): Promise<{ gameId: string; directorToken: string }>;

// Movement selection on the create/[id] page
function selectMovementStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
  movementName?: string
): Promise<void>;

// Transition game to JOINABLE
function makeGameJoinableStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string
): Promise<void>;

// Player joins a game and selects a seat
function joinGameStep(
  page: Page,
  testInfo: TestInfo,
  gameId: string,
  options: { seat: string; players: { firstName: string; lastName: string }[] }
): Promise<void>;

// Player enters a contract result for a board
function enterResultStep(
  page: Page,
  testInfo: TestInfo,
  options: { gameId: string; seat: string; board: number; passOut?: boolean }
): Promise<void>;

// Delete all E2E journey games from the database
function cleanupGames(baseURL: string): Promise<void>;
```

### Playwright Config Interface

```typescript
// New projects added to projects[] in playwright.config.ts
{
  name: "journeys-phone",
  testDir: "./tests/journeys",
  use: {
    ...devices["iPhone 12"],  // viewport 390x844, touch, mobile UA
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
},
{
  name: "journeys-tablet",
  testDir: "./tests/journeys",
  use: {
    viewport: { width: 800, height: 1280 },  // Amazon Fire HD 8
    deviceScaleFactor: 1.5,
    hasTouch: true,
    isMobile: true,
    userAgent: "Mozilla/5.0 (Linux; Android 11; KFTRWI) AppleWebKit/537.36 (KHTML, like Gecko) Silk/98.4.1 like Chrome/98.0.4758.136 Mobile Safari/537.36",
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
}
```

## Data Models

No new data models are introduced. Journey tests operate on the existing application data models through the UI and API:

- **Game** — created via `/create` form, managed via `/manage/[id]/*` routes
- **Player/Seat** — assigned via `/join/[gameId]/player`
- **Result** — submitted via `/play/[gameId]/[seat]` contract entry UI
- **Timer** — configured and controlled via `/manage/[id]/timer`
- **Club Settings** — managed via `/settings/club` and `/api/system/club`

### Test Naming Convention

All games created by journey tests use the prefix `"E2E Journey"` in their event name to enable targeted cleanup:

```typescript
const eventName = `E2E Journey - ${testInfo.title} - ${Date.now()}`;
```

## Error Handling

### Test Failure Screenshots

Playwright's `screenshot: "only-on-failure"` config automatically captures a screenshot when a test fails. Combined with `testInfo.attach()` calls within steps, the HTML report provides both the last successful state and the failure state.

### Context Cleanup on Failure

The `try/finally` pattern ensures browser contexts are closed even when a test assertion fails mid-journey:

```typescript
try {
  // Journey steps...
} finally {
  await player2Context.close();
  await player1Context.close();
  await directorContext.close();
}
```

### Database Cleanup Resilience

The `cleanupGames` helper wraps each individual game deletion in a try/catch so that a single failed deletion does not prevent other games from being cleaned up:

```typescript
for (const game of games) {
  try {
    await fetch(`${baseURL}/api/games/${game.gameId}/delete`, { ... });
  } catch {
    console.warn(`Failed to delete game ${game.gameId} during cleanup`);
  }
}
```

### Timeout Strategy

| Level | Timeout | Purpose |
|-------|---------|---------|
| Test | 120s | Allows multi-actor journeys with Socket.IO waits |
| Action | 30s | Individual page interactions (fills, clicks, navigations) |
| Expect | 15s | Assertions that wait for Socket.IO-driven UI updates |
| Navigation | inherited | Uses Playwright's default navigation timeout |

### Socket.IO Event Synchronisation

Rather than polling or artificial delays, journey tests rely on Playwright's auto-waiting assertions to synchronise with Socket.IO-driven updates:

```typescript
// After Player 1 submits, wait for Player 2's UI to reflect the change
await expect(player2Page.getByText("Waiting for confirmation")).toBeVisible();
```

This uses Playwright's built-in retry mechanism (up to the expect timeout) to wait for the Socket.IO event to propagate through the server and update Player 2's DOM.

## File Organisation

```
tests/journeys/
├── helpers.ts                      — shared step functions + cleanup
├── game-lifecycle.journey.ts       — full game: create → join → play → complete
├── result-entry.journey.ts         — NS + EW enter matching results → confirmation
├── result-mismatch.journey.ts      — conflicting results → mismatch → director resolution
├── director-correction.journey.ts  — director corrects via traveller view
├── timer-management.journey.ts     — timer CRUD + player sync via Socket.IO
├── game-status.journey.ts          — status transitions + joinable list filtering
├── game-deletion.journey.ts        — delete confirmation + post-deletion verification
├── settings.journey.ts             — PIN gate + WiFi + club settings persistence
├── usebio-download.journey.ts      — USEBIO XML export with club data
└── movement-selection.journey.ts   — movement selection + player schedule display
```

Each file follows the pattern:
1. Import helpers and devices
2. `test.beforeAll` — cleanup
3. One or more `test()` blocks using `{ browser }` fixture and `testInfo`
4. `test.afterAll` — cleanup

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

This feature is an E2E test infrastructure specification. The acceptance criteria describe integration-level test scenarios (specific user flows), configuration checks (smoke tests), and code structure requirements (examples). None of the criteria exhibit meaningful input variation suitable for property-based testing.

**Reasoning:**
- Requirements 1, 2, 3, 14, 15 are about test infrastructure configuration and code structure — they are either SMOKE or EXAMPLE tests
- Requirements 4–13 describe specific journey scenarios that execute a fixed sequence of user actions — these are INTEGRATION tests by nature
- There are no pure functions, serializers, parsers, or algorithmic logic being specified that would benefit from randomized input generation
- Running 100 iterations of "Director creates a game" does not reveal more bugs than running it once — the behavior is deterministic for a given input

**Classification summary:**
- SMOKE: Requirements 1.1–1.5, 1.7, 3.4
- EXAMPLE: Requirements 1.6, 2.1–2.4, 3.1–3.3, 14.1–14.6, 15.1–15.4
- INTEGRATION: Requirements 4.1–4.10, 5.1–5.5, 6.1–6.6, 7.1–7.7, 8.1–8.7, 9.1–9.4, 10.1–10.5, 11.1–11.5, 12.1–12.5, 13.1–13.5
- EDGE_CASE: Requirement 15.2

No property-based tests are appropriate for this feature. The journey tests themselves serve as the validation mechanism — each journey test file is an integration test that exercises a complete user flow through the real application stack.
