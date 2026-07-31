# Design Document: E2E Test Coverage

## Architecture Overview

The E2E test suite uses Playwright to verify the Bridge Box Scorer application end-to-end across three browser profiles (webkit, Mobile Chrome, Mobile Safari). Tests exercise the Next.js app running at `localhost:3000` via the `npm run start` webServer configuration.

### Key Design Decisions

1. **One test file per feature area** — aligns with existing convention (`auth.spec.ts`, `create-game.spec.ts`, etc.)
2. **Shared fixtures for authenticated director state** — a `tests/fixtures/` module providing `test.extend` fixtures that create a game via the UI form and capture the director token from localStorage
3. **Socket.IO via browser execution** — since the browser's Socket.IO client connects normally during Playwright tests, game creation through the UI form works end-to-end and the director token is stored in localStorage automatically
4. **API-level tests via `request` context** — for endpoints that don't require browser interaction
5. **Partial flow testing** for Socket.IO-only features — test page rendering and initial states rather than full interactive flows

---

## Component Design

### Test File Structure

```
tests/
├── fixtures/
│   ├── game-fixture.ts         # Shared fixture: creates a game via UI, exposes gameId + directorToken
│   └── director-fixture.ts     # Shared fixture: authenticated director page with localStorage token
├── auth.spec.ts                # (existing) Director authentication lifecycle
├── create-game.spec.ts         # (existing + expanded) Game creation form + full submit
├── join-game.spec.ts           # (existing + expanded) Join flow: select-game → menu → player
├── manage-games.spec.ts        # (existing + expanded) Manage select-game + claim code
├── director-menu.spec.ts       # NEW: Director menu navigation to all 6 sub-pages
├── change-status.spec.ts       # NEW: Status transitions with API verification
├── delete-game.spec.ts         # NEW: Delete flow with confirmation + cancel
├── correct-result.spec.ts      # NEW: Correct-result wizard multi-step flow
├── download-usebio.spec.ts     # NEW: USEBIO download form + API call
├── movement.spec.ts            # NEW: Movement detail view + empty state
├── timer.spec.ts               # NEW: Timer pages rendering (director + player)
├── leaderboard.spec.ts         # NEW: Leaderboard page + API
├── play.spec.ts                # NEW: Play flow partial tests (page rendering)
├── api.spec.ts                 # (existing + expanded) API coverage gaps
├── navigation.spec.ts          # (existing + expanded) Back-button tests
├── settings.spec.ts            # (existing)
├── settings-menu.spec.ts       # (existing)
├── club-settings.spec.ts       # (existing)
└── smoke.spec.ts               # (existing)
```

### Fixture Design

#### Game Fixture (`tests/fixtures/game-fixture.ts`)

The central fixture that other test files depend on. Creates a game through the browser UI form, which triggers Socket.IO internally and stores the director token in localStorage.

```typescript
import { test as base, expect, Page } from "@playwright/test";

interface GameFixture {
  gameId: string;
  eventName: string;
  directorToken: string;
}

async function createGameViaUI(page: Page, eventName: string, tables: number = 2): Promise<GameFixture> {
  await page.goto("/create");
  await page.getByLabel("Event Name").fill(eventName);
  await page.getByLabel("Director Name").fill("E2E Director");

  // Set tables count
  const incrementButton = page.getByRole("button", { name: "+" });
  for (let i = 1; i < tables; i++) {
    await incrementButton.click();
  }

  // Submit — triggers Socket.IO create-game, stores directorToken in localStorage
  await page.getByRole("button", { name: "Next" }).click();

  // Wait for redirect to /create/[id]
  await page.waitForURL(/\/create\/.+/);
  const url = page.url();
  const gameId = url.split("/create/")[1];

  // Extract director token from localStorage
  const directorToken = await page.evaluate(
    (gid) => localStorage.getItem(`director:${gid}`),
    gameId
  );

  return { gameId, eventName, directorToken: directorToken! };
}

export const test = base.extend<{ gameFixture: GameFixture }>({
  gameFixture: async ({ page }, use) => {
    const fixture = await createGameViaUI(page, `E2E Test ${Date.now()}`);
    await use(fixture);
  },
});

export { expect };
```

#### Director Page Fixture (`tests/fixtures/director-fixture.ts`)

Extends the game fixture to provide a page pre-configured with the director token in localStorage, enabling navigation to any `/manage/[id]/...` route without being redirected by `DirectorGuard`.

```typescript
import { test as base, expect, Page } from "@playwright/test";

interface DirectorContext {
  page: Page;
  gameId: string;
  eventName: string;
  directorToken: string;
}

export const test = base.extend<{ directorContext: DirectorContext }>({
  directorContext: async ({ page }, use) => {
    // Create game via UI (gets director token in localStorage)
    await page.goto("/create");
    const eventName = `E2E Director ${Date.now()}`;
    await page.getByLabel("Event Name").fill(eventName);
    await page.getByLabel("Director Name").fill("E2E Director");
    await page.getByRole("button", { name: "Next" }).click();
    await page.waitForURL(/\/create\/.+/);

    const gameId = page.url().split("/create/")[1];
    const directorToken = await page.evaluate(
      (gid) => localStorage.getItem(`director:${gid}`),
      gameId
    );

    await use({ page, gameId, eventName, directorToken: directorToken! });
  },
});

export { expect };
```

### Strategy for Joinable Game State

Several tests require a game in `JOINABLE` status. After creating a game via the UI fixture (which produces a `CREATED` game), we use the REST API to transition the status:

```typescript
async function makeGameJoinable(request: APIRequestContext, gameId: string, directorToken: string) {
  const res = await request.post(`/api/games/${gameId}/status`, {
    data: { status: "JOINABLE", directorToken },
  });
  expect(res.ok()).toBe(true);
}
```

This is possible because the `/api/games/[gameId]/status` endpoint accepts the director token in the request body (not just from localStorage).

---

## Interface Design

### Test Helper Functions

```typescript
// tests/fixtures/helpers.ts

/** Navigate to a director sub-page, with director token already in localStorage */
export async function navigateToDirectorPage(
  page: Page,
  gameId: string,
  subPage: string
): Promise<void> {
  await page.goto(`/manage/${gameId}/${subPage}`);
  await page.waitForLoadState("networkidle");
}

/** Intercept an API route and return a custom response */
export async function interceptRoute(
  page: Page,
  urlPattern: string | RegExp,
  response: { status: number; body: object }
): Promise<void> {
  await page.route(urlPattern, (route) =>
    route.fulfill({
      status: response.status,
      contentType: "application/json",
      body: JSON.stringify(response.body),
    })
  );
}
```

---

## Data Flow

### Game Creation → Director Token → Sub-page Access

```
1. page.goto("/create")
2. Fill form fields (Event Name, Director Name, Tables)
3. Click "Next" → Socket.IO emitWithAck("create-game", ...)
4. Server creates game, returns { game, directorToken }
5. Client stores directorToken in localStorage["director:{gameId}"]
6. Browser redirects to /create/{gameId}
7. Test extracts gameId from URL, directorToken from localStorage
8. Subsequent navigations to /manage/{gameId}/... pass DirectorGuard check
```

### Status Transition for Join Tests

```
1. Game created via fixture (status: CREATED)
2. POST /api/games/{gameId}/status { status: "JOINABLE", directorToken }
3. Game now visible on /join/select-game
4. Player can navigate through join flow
```

### API-Level Tests (No Browser Required)

```
1. Use Playwright request context directly
2. Call endpoint, assert status code + response shape
3. No page navigation or localStorage needed
```

---

## Error Handling Strategy

### Route Interception for Error Scenarios

For tests that verify error display (Req 5.4, 6.5, 10.3), use Playwright's `page.route()` to intercept API calls and return error responses:

```typescript
test("shows error when delete API fails", async ({ page }) => {
  await page.route("**/api/games/*/delete", (route) =>
    route.fulfill({ status: 500, body: JSON.stringify({ error: "Server error" }) })
  );
  // Navigate and trigger delete...
  await expect(page.getByRole("alert")).toHaveText(/error/i);
});
```

### Socket.IO Unavailability Testing

For Requirement 1.3 (Socket.IO connection failure), the approach is to intercept the socket.io transport at the network level:

```typescript
test("shows error when Socket.IO is unavailable", async ({ page }) => {
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.goto("/create");
  // Fill and submit form...
  await expect(page.getByText(/failed|error/i)).toBeVisible();
});
```

---

## Testing Strategy by Feature Area

### Fully Testable via UI + REST

| Feature | Strategy |
|---------|----------|
| Game Creation | Submit form → Socket.IO works in browser |
| Director Menu | Use fixture with localStorage token |
| Change Status | Director fixture + REST POST status |
| Delete Game | Director fixture + REST DELETE |
| Download USEBIO | Director fixture + form fill + route intercept |
| Navigation | Standard page navigation assertions |
| API Endpoints | Direct `request` context calls |

### Partially Testable (Socket.IO Dependencies)

| Feature | What's Testable | What's Not |
|---------|----------------|------------|
| Correct Result | Board selection + wizard steps (with pre-seeded data via override API) | Cannot create board data without game having a movement |
| Movement View | Empty state rendering | Populated movement (requires Socket.IO to select movement) |
| Play Flow | Page rendering for a given URL | Full round progression (requires participants + movement via Socket.IO) |
| Timer | Page rendering (empty state) | Active timer (requires Socket.IO timer:create) |
| Leaderboard | Page rendering + API endpoint | Real scores (requires Socket.IO result submission) |
| Join → Player | Seat display page | Actual seat assignment (Socket.IO createParticipant) |

### Recommended Test Flow per Feature

**Director Menu Navigation Tests** — serial flow reusing one game:
1. Create game via fixture
2. Navigate to `/manage/[id]/menu`
3. Click each of 6 buttons, verify URL, navigate back

**Change Status Tests** — requires status transitions:
1. Create game (CREATED status)
2. Navigate to change-status page
3. Verify all 3 buttons visible, active one distinguished
4. Click "Open for Players" → verify redirect to menu
5. Navigate back to change-status, click "Complete" → verify

**Delete Game Tests** — destructive, run last:
1. Create game via fixture
2. Navigate to delete-game page
3. Verify confirmation message with event name
4. Test cancel → verify returns to menu
5. Test delete → verify redirect to select-game

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

After analyzing all 14 requirements, the acceptance criteria are overwhelmingly **example-based** or **integration** tests. E2E Playwright tests by nature verify specific user flows through a running application — they are scenario-driven, not property-driven. The criteria test specific page renderings, specific navigation paths, and specific API responses rather than universal properties across randomly generated inputs.

However, there are two structural properties about the test infrastructure itself and the API response contracts that can be expressed universally:

### Property 1: Director token gate consistency

*For any* director management page (`/manage/[id]/timer`, `/manage/[id]/correct-result`, `/manage/[id]/change-status`, `/manage/[id]/movement`, `/manage/[id]/download-usebio`, `/manage/[id]/delete-game`), navigating to that page without a valid director token in localStorage SHALL result in a redirect to `/manage/select-game`.

**Validates: Requirements 3.1**

### Property 2: Game API 404 consistency

*For any* game-specific API endpoint (`/api/games/[gameId]/boards`, `/api/games/[gameId]/movement`, `/api/games/[gameId]/leaderboard`, `/api/games/[gameId]/schedule/[seat]`) called with a non-existent gameId, the API SHALL return HTTP 404 with `{ success: false }` in the response body.

**Validates: Requirements 8.2, 9.3, 12.4**

### Property 3: Navigation back-button consistency

*For any* sub-page reachable from a parent menu (director menu sub-pages, settings sub-pages), activating the back/cancel control SHALL navigate the user to the immediate parent menu page, never to an unrelated page.

**Validates: Requirements 13.1, 13.2, 13.3, 13.4**

---

## Test Execution Considerations

### Parallelism

- Tests within a `describe.serial` block run sequentially (game creation + dependent flows)
- Independent feature files run in parallel across workers
- The `gameFixture` creates a unique game per test file to avoid cross-test interference

### Mobile Viewport Handling

All tests run across webkit, Mobile Chrome, and Mobile Safari. The app is mobile-first, so tests should:
- Use role-based locators that work regardless of viewport
- Avoid assumptions about element positions
- Account for mobile navigation patterns (no hover states)

### Cleanup

Games created during tests persist in the database. The delete-game test file serves as natural cleanup. For CI environments, consider a `globalTeardown` that cleans test data, or accept that the test database is ephemeral.
