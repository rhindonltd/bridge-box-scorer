# E2E Test Coverage Audit — Bridge Box Scorer

## Purpose

This document audits end-to-end (Playwright) test coverage for the Bridge Box
Scorer app. It was produced by mapping every test under `tests/` (browser specs
`*.spec.ts`, multi-device journeys `tests/journeys/*.journey.ts`, and
request-context API/socket tests) against the full application surface (routes
under `src/app`, HTTP handlers under `src/app/api`, and Socket.IO events under
`src/socket`).

The bulk of this file is the **gap list**: functionality that has **no E2E
coverage**, with enough detail to act on each item. A short summary of what *is*
covered is included first for context.

## How to read this

- Each gap entry names the feature, points to the implementing file(s), states
  why it matters, and notes whether it is a true test gap or blocked (no UI, or
  environment-dependent).
- "Blocked" means it cannot currently be E2E-tested (missing UI, or needs real
  device hardware), not that it is low value.

## Method / date

Assessed by reading all current test files and cross-referencing the app
surface. Test files present at audit time:

- Specs: `smoke.spec.ts`, `api.spec.ts`, `api-contract.spec.ts`,
  `game-api.spec.ts`, `club-settings.spec.ts`, `settings.spec.ts`,
  `settings-menu.spec.ts`, `bridgewebs-settings.spec.ts`, `results-live.spec.ts`.
- Journeys: `navigation`, `create-form`, `sections-setup`, `table-management`,
  `movement-types`, `seating-detail`, `play-flow`, `played-contract`,
  `contract-variants`, `mismatch`, `sit-out`, `deal-entry`, `swiss-pairs`,
  `swiss-pairs-half-matches`,
  `director-override`, `traveller-live`, `leaderboard-live`, `display-detail`,
  `request-on-mount`, `realtime-internals`, `reconnect`, `timer`,
  `multi-section`, `share-code`, `delete-game`, `usebio`, `pbn`,
  `bridgewebs-upload`, `bridgewebs-create`, `seat-transfer`, `leave-table`,
  `completed-game-redirect`, `admin-key`, `wifi-settings`, `authorization`.

## Status (last updated after Phases 1–4)

Every **true (unblocked) test gap** the original audit found has been closed —
see "Recently closed" below. Swiss Teams play & seating (items 7 and 12) is now
also covered end-to-end (`swiss-teams.journey.ts`), and scoring-type selection
(item 13) is implemented and exercised via the create form. The only remaining
open items are **blocked** on missing UI or real hardware (American Whist,
cloud/subscription, WiFi success on the box — manually verified, and timer
`restart:true`). No further automated E2E is authorable for those.

---

## Coverage summary (what IS tested)

These areas have working E2E coverage and are **not** repeated in the gap list
below:

- **Navigation & selection**: main menu links, join/display/manage selectors,
  not-found, joinable-games live update + reconnect (`navigation.journey.ts`).
- **Game creation**: fields, Pairs/Teams selector, date default, opening-lead
  toggle, create success/failure (`create-form.journey.ts`).
- **Director setup**: table resize + evict + shrink guard
  (`table-management.journey.ts`); section add/rename/delete + pills
  (`sections-setup.journey.ts`, `multi-section.journey.ts`); Mitchell + Howell
  select→seat→start→play (`movement-types.journey.ts`); Start Game
  (`fixtures/game-setup.ts`, unit-covered `StartGameScreen`).
- **Player join & seating**: EBU search, seat labels, live seat-occupancy sync
  (`seating-detail.journey.ts`).
- **Player play**: full ContractWizard (level→suit→declarer→lead→made/down→
  confirm), lead ON/OFF, doubled/redoubled, Pass Out, Not Played, board paging,
  first-incomplete-round resume, sit-out, game-complete
  (`played-contract`, `contract-variants`, `play-flow`, `sit-out`).
- **Dual-side confirmation**: match→confirm, both mismatch variants + re-enter
  (`mismatch.journey.ts`), sit-out submission rejection.
- **Board deal capture**: player post-round deal entry + director Enter Deals +
  show-hand on traveller (`deal-entry.journey.ts`).
- **Swiss Pairs**: single-section setup, play round 1, draw round 2 from the
  Movement screen (`swiss-pairs.journey.ts`).
- **Swiss Pairs "2 half matches"** (odd field): set up a Swiss game with a
  half-matches odd-handling plan, seat an odd field (one seat short), start so
  round 1 materialises as a half-match group (HALF_AVERAGE compensation rows,
  not a sit-out), score the played halves over a socket, draw round 2, and
  assert the leaderboard credits exactly the seated pairs with no phantom line
  (`swiss-pairs-half-matches.journey.ts`).
- **Swiss Teams**: create a Teams game, pick Swiss Teams, seat a full field with
  team names, play round 1 across the open/closed rooms, draw round 2, and see
  the named teams on the leaderboard (`swiss-teams.journey.ts`).
- **Director overrides**: played-contract override, adjusted-score (custom +
  preset), propagation to player + second director
  (`director-override.journey.ts`, `traveller-live.journey.ts`).
- **Real-time**: request-on-mount, occupancy-gated pushes, `game:join` does not
  replay, reconnect re-fetch (`request-on-mount`, `realtime-internals`,
  `reconnect`, `leaderboard-live`, `traveller-live`).
- **Timer**: saveConfig + promote-on-start, start/pause, next/prev, adjust,
  apply-to-future, updateConfig, breaks, session-length preview, status panel,
  multi-section picker + chooser (`timer.journey.ts`, `multi-section`).
- **Leaderboard / traveller display**: empty→populated, live update, combined +
  per-section tabs, own-row highlight (`leaderboard-live`, `display-detail`).
- **Share director access**: full co-director round-trip, countdown, regenerate,
  invalid + already-used rejection (`share-code.journey.ts`).
- **Delete game**: confirm, token clear, failure inline error
  (`delete-game.journey.ts`).
- **USEBIO export**: happy-path download + club-field validation + 404
  (`usebio.journey.ts`).
- **PBN export**: deal recorded → populated `.pbn` download + club-not-configured
  gate + director-auth (`pbn.journey.ts`, `authorization.journey.ts`).
- **BridgeWebs**: results upload success/failure against a mocked BridgeWebs
  server (`bridgewebs-upload.journey.ts`); credentials settings save + admin-
  gating + password-never-exposed (`bridgewebs-settings.spec.ts`); create-page
  event picker → name prefill + `bridgewebsEventId` persistence
  (`bridgewebs-create.journey.ts`).
- **Seat transfer / Change device**: mint → claim → seat handover + secret
  rotation (old token rejected, new accepted) + invalid code
  (`seat-transfer.journey.ts`).
- **Player leave table**: pre-start un-seat frees the seat live
  (`leave-table.journey.ts`).
- **Completed game**: hidden from Join; join/play URLs redirect to leaderboard
  (`completed-game-redirect.journey.ts`).
- **Settings/device**: admin-key gate + verify + full update cycle + logout
  re-gate + validate contract (`admin-key.journey.ts`); WiFi capability-aware UI
  + admin-gated scan (`wifi-settings.journey.ts`, `settings.spec.ts`); club info
  page + API (`club-settings.spec.ts`, `settings-menu.spec.ts`).
- **Auth**: director socket + HTTP 401s, admin 401s, intentionally-open events
  (`authorization.journey.ts`).
- **HTTP API contract**: games reads/404s, movements 400/404, players search,
  system routes (`api.spec.ts`, `api-contract.spec.ts`, `game-api.spec.ts`).

---

## Recently closed (Phases 1–4)

Every gap below was a "true test gap" in the original audit and now has E2E
coverage. Kept here (rather than deleted) as a record of what closed each and
where the coverage lives.

### 1. PBN export (director) — CLOSED

- `tests/journeys/pbn.journey.ts`: records a deal (director Enter Deals), then
  downloads the `.pbn` and asserts non-empty content with the `[Event`,
  `[Board "n"]` and `[Deal` tags; plus a club-not-configured disabled state.
- Director-auth (401 no/bogus token) added to `authorization.journey.ts`.
- Note discovered: the PBN service returns an EMPTY file when no deals are
  entered, so the happy path must record a deal first (unlike USEBIO).

### 2. BridgeWebs results upload (director) — CLOSED

- `tests/journeys/bridgewebs-upload.journey.ts`: success (asserts the reply
  status + that the mock received `type=upload`, club, password, `.xml`/`.pbn`
  files) and BridgeWebs-reported failure (inline error).
- The **real BridgeWebs server is mocked**: `BRIDGEWEBS_API_BASE` is env-
  overridable (`src/lib/bridgewebs/client.ts`) and a local mock
  (`tests/fixtures/bridgewebs-mock.ts`) stands in; `playwright.config.ts` wires
  the app server to it. Guarded to a loopback host so it never hits real
  BridgeWebs.
- Director-auth (401) added to `authorization.journey.ts`. Not-configured gating
  stays unit-covered (no API to clear credentials).

### 3. BridgeWebs credentials settings — CLOSED

- `tests/bridgewebs-settings.spec.ts`: settings-menu link → `/settings/bridgewebs`;
  UI save flow + reload shows configured + "leave blank to keep"; `GET` status
  shape never exposes the password; `POST` admin-gated (200/401); blank club →
  400; blank password keeps the stored one.

### 4. BridgeWebs event picker on Create — CLOSED

- `tests/journeys/bridgewebs-create.journey.ts`: with credentials seeded and the
  mock serving events, the picker renders, selecting an event prefills the name,
  and `bridgewebsEventId` persists on the created game (verified via
  `GET /api/games/[id]`).

### 5. Seat transfer / "Change device" (player) — CLOSED

- `tests/journeys/seat-transfer.journey.ts`: mint on the old device (play header
  → "Change device"), claim on a new device, land on the seat's play page; the
  secret rotation is proven by the stored secret changing AND an old-token submit
  being rejected while a new-token submit is accepted (`tests/fixtures/seat-secret.ts`).
  Plus an invalid-code rejection.

### 6. Player "leave table" (pre-start un-seat) — CLOSED

- `tests/journeys/leave-table.journey.ts`: a pre-start player leaves the seat
  (accepting the native confirm), routes back to `/join`, and a watching device
  sees the seat become available again live.

### 8. Admin session lifecycle: logout & re-validation — CLOSED

- `tests/journeys/admin-key.journey.ts` (extended): logging out re-gates the
  settings section (the admin-key prompt returns); `GET .../admin-key/validate`
  returns 200 `{valid:true}` with a good token and 401 without/with a bogus one.

### 9. Director token validation endpoint — CLOSED

- `authorization.journey.ts`: `GET /api/games/[id]/director/validate` → 200
  `{valid:true}` with a valid token, 401 with none/bogus.

### 11. Assorted API contract endpoints — CLOSED

- `api-contract.spec.ts`: `results-summary` now asserts the full
  `{totalPlayable, finalized, allResultsIn}` shape; `wifi/diagnostics` added
  (admin-gated + shape). `/games/all` and `start-check` were already covered.

### 10. `game:selectMovement` socket event — TRIAGED (no gap)

- Still used by the client (`src/lib/game-service.ts` `selectMovement` /
  `selectMitchellMovement`), so not dead code. Its director-auth is already
  unit-tested (`select-movement.handler.test.ts` — "rejects when directorToken
  is invalid") plus integration tests. No E2E gap; not a removal candidate.

### 7 & 12. Swiss Teams draw + Teams play & seating — CLOSED

- `tests/journeys/swiss-teams.journey.ts`: creates a Teams game (IMP-VP scoring),
  picks Swiss Teams, seats a full field entering a team name per home (NS) pair,
  starts, scores round 1 across the open/closed rooms over a socket, then draws
  round 2 through the Movement screen (asserting the round materializes). A
  second test opens the leaderboard display and asserts the **named** teams
  ("Team A1"/"Team A2") appear. A third test opens the director traveller for a
  board and asserts it is framed as a **team match** ("Team A1 v Team A2") with
  each room (open/closed) shown as its own selectable row.
- New fixtures: `pickSwissTeamsMovement` (`tests/fixtures/game-setup.ts`);
  `createGame` gained `gameType` + `teamsScoring` options and its
  "Record Opening Lead" toggle click is now label-scoped (the Teams form adds an
  "Allow Hand Entry" toggle, so an unscoped "No" was ambiguous); `join.ts` gained
  `seatTeamPairBySeat` and `seatTeamsFieldOnDevices` (team-name aware seating).
- **Product bug found & fixed by this journey**: the leaderboard classified a
  Swiss / Swiss Teams game as a plain board-pooled pairs event because the
  movement is stored per section (games DB), not on the game-index row that
  `readLeaderboardInputs` read via `parseSelectedMovement`. For a teams `IMP_VP`
  game that threw ("no overall plugin for the board-pooled path"); for Swiss
  Pairs it silently mis-ranked. Fixed by falling back to the section movement
  (`getAnySectionMovement`) when the game-index copy is null
  (`src/services/leaderboard-service.ts`), with a unit test in
  `leaderboard-service.test.ts`.
- The teams review is also **editable** (swap two teams, live repeat re-check,
  commit-exactly-shown), covered by `swapTeams`/`evaluateSwissTeamsRound` unit
  tests, a control swap-then-commit test, and the `EditsThenCommits` story.
- The **director traveller is now team-framed** for a teams game: the flat
  per-table rows are grouped into team-match cards (open/closed rooms, team
  names, per-board IMP margin, "Tied"/"Three-way"), each room still selectable
  for a per-table override. Built server-side in `buildTeamTravellerMatches`
  (reusing the tested `team-match.ts` reconstruction) and gated on the section
  movement source in `buildTravellerPayload`; the pairs path is unchanged.
  Covered by `board-service` + `Traveller` unit tests, a `Teams` story, and the
  journey's third test. (The pairs override journeys still pass, so the shared
  `openDirectorTraveller` fixture change is safe.)

---

## Gaps — blocked (no UI or environment-dependent)

### 7. Swiss Teams draw — CLOSED (see "Recently closed")

- Fully covered end-to-end by `swiss-teams.journey.ts` (create Teams game →
  pick Swiss Teams → seat a full field with team names → start → score round 1
  over sockets → draw round 2 through the UI). The preview → edit → commit and
  advisory behaviour also have unit/story coverage. See "Recently closed" below.

### 12. Teams play & seating — CLOSED (see "Recently closed")

- The audit's original claim (join flow ignores `gameType`, no team names) is
  stale: `SelectSeatPage` branches on `game.gameType === "TEAMS"` and collects an
  optional team name for the home (NS) pair, `createParticipant` plumbs it to
  `createPairWithPlayers`, and teams are derived from seating by `findTeams`. A
  full Teams journey now exists — see "Recently closed" below.

### 13. Scoring-type selection (MP / IMP / Cross-IMP) — IMPLEMENTED

- `scoringType` is chosen on the create form (`src/app/create/CreateGamePage.tsx`):
  a **Pairs** game offers Matchpoints or Cross-IMPs; a **Teams** game offers IMP,
  IMP (Victory Points), and a board-comparison option (Point-a-Board / Board-a-
  Match by locale). The value is stored on the game-index row and consumed at
  play time. The selector is exercised by the Swiss Teams journey
  (`createGame` picks a teams scoring), and the scoring math is unit-tested under
  `src/scoring/`. No longer a gap.

### 14. American Whist movement

- **What**: Listed as a movement type in the product spec, but the recommendation
  picker never offers it at any table count, and no American/Whist option exists
  in the movement UI.
- **Blocked**: no UI path to select it, so it cannot be E2E-tested through setup.
  (Product gap, not just a test gap.)

### 15. Cloud / subscription features

- **What**: Publish results to the BridgeBox cloud, receive appliance software
  updates, back up appliance data (product spec).
- **Blocked**: no front-end routes or API handlers exist for these; nothing to
  test. (BridgeWebs upload — item 2 — is a separate third-party integration, not
  the BridgeBox cloud service.)

### 16. WiFi scan/test SUCCESS + Save-gating on real hardware — VERIFIED ON THE BOX

- **What**: The real scan/test cycle (hotspot drops, device reconnects, picker
  populates, a successful test of the selected SSID enables Save).
- **Where**: `wifi-settings.journey.ts` covers the capability-aware UI, the
  unavailable page, and admin-gating; the success path exercises real
  `nmcli`/WiFi.
- **Status**: the full scan → test → save-and-apply cycle has been **verified
  working on the appliance**. It is not part of automated CI (it needs the
  hardware to drop and reconnect its own radio, which CI cannot do), so it stays
  a manual on-box check; the disabled/gated states are covered automatically.

### 17. Timer `restart:true` (previous-phase first step)

- **What**: The engine's "first press of Previous restarts the current phase"
  (`restartPhase`) behaviour.
- **Blocked**: not wired to any UI button (the live "‹ Prev" only ever sends
  `previousPhase`), so it is unreachable through the UI. Engine-unit-tested in
  `bridge-timer-engine.test.ts`.

---

## Deliberately unit/integration-covered (not forced into E2E)

These are intentionally left to unit/int tests because they are not cleanly
reachable or are timing-fragile in a browser:

- **Error boundary** (`src/app/error.test.tsx`) — no clean UI throw path
  (unknown games call `notFound()`, not `throw`).
- **Leaderboard / traveller empty-state copy** — not reachable for a *started*
  game (boards always have round instances / a non-null snapshot with zero rows);
  unit-covered (`DisplayLeaderboardPage.test.tsx`, `Traveller.test.tsx`).
- **Invalid break-timing alert** — wall-clock-projection fragile; unit-covered
  (`src/timer/breaks.test.ts`, `TimerConfigView.test.tsx`, `TimerLiveView.test.tsx`).
- **Share-code expiry** — 5-minute product constant with no test-only short-expiry
  seam; int-covered (`system.int.test.ts`).
- **`useSocketSWRSync`** — client-only hook with no independent server-observable
  behaviour; unit-covered (`socket-swr-sync.test.ts`) and exercised live via the
  seating/leaderboard/traveller journeys.
- **Transient in-flight labels** ("Creating…", "Saving…", "Deleting…", 1-second
  local timer tick, `serverNow` clock-offset) — transient/timing; not forced.

---

## Prioritized action list — all unblocked work CLOSED

The four phases below were the original prioritized backlog. All are now done
(see "Recently closed"). Only blocked items remain.

- **P1 — Director export/publish paths:** ✅ PBN export (item 1); ✅ BridgeWebs
  upload against a mocked server (item 2).
- **P2 — BridgeWebs configuration surface:** ✅ credentials settings (item 3);
  ✅ create-page event picker (item 4).
- **P3 — Player device/session flows:** ✅ seat transfer + rotation (item 5);
  ✅ player leave-table (item 6); ✅ admin logout + validate (item 8).
- **P4 — Contract/coverage tidy-ups:** ✅ director-token validate (item 9);
  ✅ `results-summary`/`wifi/diagnostics` contracts, with `/games/all` +
  `start-check` already covered (item 11); ✅ `game:selectMovement` triaged as
  used + already-covered (item 10). ✅ Swiss Teams draw + Teams play & seating
  (items 7 & 12) closed end-to-end (`swiss-teams.journey.ts`), which also
  uncovered and fixed a leaderboard movement-classification bug.

**Remaining — blocked (needs UI or hardware first, cannot E2E now):**
American Whist (14), cloud/subscription (15), WiFi success on the box (16 —
manually verified on the appliance, not automatable in CI), timer `restart:true`
(17). Scoring-type selection (13) is now implemented and covered via the create
form. The rest need a product surface or hardware that does not exist yet.

## Infrastructure added while closing gaps

- **BridgeWebs base URL is env-overridable** (`src/lib/bridgewebs/client.ts`) so
  the outbound API call can be pointed at a local mock; the mock server lives in
  `tests/fixtures/bridgewebs-mock.ts` and `playwright.config.ts` wires the app
  server to it by default (loopback-guarded so real BridgeWebs is never hit).
- **`tests/fixtures/seat-secret.ts`**: read a seat's secret from the per-game DB
  and submit a result over a raw socket with a chosen token (for rotation proofs).
- **`expectInlineError(page, text)`** in `tests/journeys/support.ts`: asserts an
  app inline message by text, avoiding the Next route-announcer `role="alert"`
  ambiguity.
- **Fixed a pre-existing build blocker**: four Storybook fixtures were missing
  the `bridgewebsEventId` field on their `BridgeGame` literals, which failed the
  production `tsc`/build the journeys depend on. Added `bridgewebsEventId: null`
  to each.

### Running the BridgeWebs journeys

Journeys use `--reporter=list` (the default `html` reporter opens a browser and
blocks). The BridgeWebs upload/create journeys need the app server pointed at
the mock — `playwright.config.ts` does this automatically for a Playwright-
launched server; a manually-started reused server must set the same
`BRIDGEWEBS_API_BASE`.
