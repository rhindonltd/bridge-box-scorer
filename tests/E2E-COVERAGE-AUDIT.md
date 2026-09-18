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
  `settings-menu.spec.ts`, `results-live.spec.ts`.
- Journeys: `navigation`, `create-form`, `sections-setup`, `table-management`,
  `movement-types`, `seating-detail`, `play-flow`, `played-contract`,
  `contract-variants`, `mismatch`, `sit-out`, `deal-entry`, `swiss-pairs`,
  `director-override`, `traveller-live`, `leaderboard-live`, `display-detail`,
  `request-on-mount`, `realtime-internals`, `reconnect`, `timer`,
  `multi-section`, `share-code`, `delete-game`, `usebio`,
  `completed-game-redirect`, `admin-key`, `wifi-settings`, `authorization`.

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
- **Completed game**: hidden from Join; join/play URLs redirect to leaderboard
  (`completed-game-redirect.journey.ts`).
- **Settings/device**: admin-key gate + verify + full update cycle
  (`admin-key.journey.ts`); WiFi capability-aware UI + admin-gated scan
  (`wifi-settings.journey.ts`, `settings.spec.ts`); club info page + API
  (`club-settings.spec.ts`, `settings-menu.spec.ts`).
- **Auth**: director socket + HTTP 401s, admin 401s, intentionally-open events
  (`authorization.journey.ts`).
- **HTTP API contract**: games reads/404s, movements 400/404, players search,
  system routes (`api.spec.ts`, `api-contract.spec.ts`, `game-api.spec.ts`).

---

## Gaps — functionality with NO E2E coverage

### 1. PBN export (director)

- **What**: The "Download PBN" flow — director downloads a `.pbn` file of the
  game's deals.
- **Where**: page `src/app/game/[gameId]/manage/download-pbn/DownloadPbnPage.tsx`;
  route `GET /api/games/[gameId]/pbn` (director-authed); menu entry
  `showDownloadPbn` in `src/app/game/[gameId]/manage/ManageGameMenu.tsx`.
- **Gap**: No spec or journey references `pbn` at all. No test for the download
  happy path, the empty/no-deals case, the director-auth requirement, or a
  nonexistent-game 404.
- **Suggested coverage**: mirror `usebio.journey.ts` — complete/seed a game,
  open Download PBN, assert a non-empty `.pbn` blob; add an API 404 for an
  unknown game and a 401 without a director token (extend
  `authorization.journey.ts`).
- **Type**: true test gap (UI + route both exist).

### 2. BridgeWebs results upload (director)

- **What**: "Upload to BridgeWebs" — pushes finished results to the club's
  BridgeWebs account. Menu entry appears only when BridgeWebs is configured and
  is disabled until all results are in.
- **Where**: page
  `src/app/game/[gameId]/manage/upload-bridgewebs/UploadBridgewebsPage.tsx`;
  route `POST /api/games/[gameId]/bridgewebs/upload` (director-authed);
  gating `showUploadBridgewebs`/`uploadBridgewebsDisabled` in `ManageGameMenu.tsx`.
- **Gap**: No test references bridgewebs upload. Uncovered: the menu item only
  showing when configured, the disabled-until-all-results-in gate, the upload
  happy path, the failure path, and director-auth on the route.
- **Type**: true test gap. The happy path likely needs the outbound BridgeWebs
  HTTP call mocked/stubbed (via `page.route` on the upload endpoint or a
  fixture), so plan for network isolation.

### 3. BridgeWebs credentials settings

- **What**: The `/settings/bridgewebs` screen where the admin saves the club's
  BridgeWebs code + password (drives items 2 and 4).
- **Where**: page `src/app/settings/bridgewebs/BridgewebsSettingsForm.tsx` /
  `BridgewebsSettingsPage.tsx`; routes `GET /api/system/bridgewebs` (status,
  never returns the password) and `POST /api/system/bridgewebs` (admin-gated).
- **Gap**: No E2E. The settings-menu spec only checks WiFi + Club links; there
  is no BridgeWebs link assertion, no save flow, and no admin-gating test on the
  route. (Unit/int coverage exists for the form and credentials query, but no
  browser/API E2E.)
- **Suggested coverage**: extend `settings-menu.spec.ts` (link present +
  navigates); add save-with-`x-admin-token` + 401-without to `api-contract.spec.ts`
  or `authorization.journey.ts`; a `bridgewebs-settings.spec.ts` for the
  configured/"leave blank to keep" password rule.
- **Type**: true test gap.

### 4. BridgeWebs event picker on Create

- **What**: When BridgeWebs is configured, the create form shows a "BridgeWebs
  Event" dropdown of that day's events; choosing one prefills the event name and
  sets `bridgewebsEventId` on the game.
- **Where**: `src/app/create/CreateGamePage.tsx` (`showEventPicker`,
  `handleSelectBridgewebsEvent`); route `GET /api/games/bridgewebs/events?date=`;
  field `bridgewebsEventId` (`src/db/game-index/schema.ts`).
- **Gap**: Tests only *wait out* the on-mount events fetch (WebKit race) — they
  never render the picker (BridgeWebs is unconfigured in the test env), select an
  event, assert the name prefill, or verify `bridgewebsEventId` persists on the
  created game.
- **Type**: true test gap, but requires seeding BridgeWebs config + stubbing the
  events endpoint.

### 5. Seat transfer / "Change device" (player)

- **What**: A seated player hands their seat to another device: the old device
  mints a transfer code; the new device claims it, which rotates the seat secret
  so only the new device owns the seat.
- **Where**: socket events `game:createSeatTransfer` / `game:claimSeatTransfer`
  (`src/socket/socket-events.ts`, `handlers/game/`); claim page
  `src/app/game/[gameId]/join/ClaimSeatTransfer.tsx`; the "Change device" entry
  in the play header menu (`PlayHeaderMenu`).
- **Gap**: No test references seat transfer / change device / claimSeatTransfer.
  Uncovered: minting a code, claiming it on a second device, the secret rotation
  (old device can no longer submit; new device can), and bad/expired-code
  rejection.
- **Type**: true test gap. A good analogue exists in `share-code.journey.ts`
  (generate-on-A / claim-on-B), so the pattern is available.

### 6. Player "leave table" (pre-start un-seat)

- **What**: A seated player vacates their seat before the game starts, freeing
  it; broadcasts PARTICIPANTS.
- **Where**: socket event `game:leaveTable` (`src/socket/socket-events.ts`,
  `handlers/game/`).
- **Gap**: No test drives `leaveTable`. Director *eviction* (the HTTP DELETE) is
  covered in `table-management.journey.ts`, but the player-initiated leave (and
  its live seat-freeing + player-token requirement) is not.
- **Type**: true test gap.

### 7. Swiss Teams draw

- **What**: Swiss Teams movement setup + drawing each round from standings (two
  tables per match).
- **Where**: setup dialog
  `src/components/manage/sections/SwissTeamsSetupDialog.tsx`; socket event
  `swissTeams:drawNextRound` (`handlers/swiss/draw-next-teams-round.handler.ts`);
  scoring in `src/scoring/swiss/swiss-teams-*`.
- **Gap**: Swiss *Pairs* is covered (`swiss-pairs.journey.ts`) but Swiss Teams
  has no journey — no setup-dialog select, no round draw, no even-team-count
  guard, no `TEAM_SWISS_VP` leaderboard rendering E2E.
- **Type**: partially blocked. Swiss Teams setup UI exists and is single-section
  only, but it is entangled with the broader Teams-play gap (item 12): team
  seating/play reuses the pairs flow, so a full Teams-scored journey may not be
  authorable until team play exists. The **round-draw + setup dialog** portions
  are testable now.

### 8. Admin session lifecycle: logout & re-validation

- **What**: `POST /api/system/admin-key/logout` invalidates the admin session;
  `GET /api/system/admin-key/validate` is the settings-unlock check that
  re-confirms a stored admin token.
- **Where**: `src/app/api/system/admin-key/logout/route.ts`,
  `src/app/api/system/admin-key/validate/route.ts`; the "Logout" action in
  `src/app/settings/SettingsMenuPage.tsx` / `LogoutButton.tsx`.
- **Gap**: `admin-key.journey.ts` covers verify + update, but not logout
  (session actually invalidated → settings re-gated) nor the validate endpoint
  (valid token passes, cleared/invalid token re-prompts).
- **Type**: true test gap.

### 9. Director token validation endpoint

- **What**: `GET /api/games/[gameId]/director/validate` returns `{ valid: true }`
  for a good director token — used to decide whether a device is already this
  game's director.
- **Where**: `src/app/api/games/[gameId]/director/validate/route.ts`.
- **Gap**: No direct contract test (valid token → `{valid:true}`; invalid/absent
  → 401). Director-manage navigation is exercised indirectly via
  `navigation.journey.ts` / `share-code.journey.ts`, but this endpoint's
  positive/negative contract is not asserted.
- **Type**: true test gap (small; add to `authorization.journey.ts`).

### 10. `game:selectMovement` socket event (game-level movement)

- **What**: The director persists a selected movement on the game row via the
  `game:selectMovement` socket event (distinct from the section-scoped HTTP
  `PUT .../sections/[section]/movement`).
- **Where**: `SELECT_MOVEMENT` (`src/socket/socket-events.ts`,
  `handlers/game/`).
- **Gap**: Movement selection is exercised through the section HTTP route
  (`movement-types.journey.ts`, `sections-setup.journey.ts`), but the
  `game:selectMovement` socket path and its director-auth are not directly
  tested. Confirm whether this event is still used by the UI; if dead, it is a
  cleanup candidate rather than a coverage gap.
- **Type**: needs triage (possibly unused).

### 11. Assorted API contract endpoints

Endpoints with no dedicated contract assertion (some are exercised indirectly):

- `GET /api/games/[gameId]/results-summary` — drives menu gating; no direct test.
- `GET /api/games/[gameId]/start-check` — pre-start validation; unit-covered via
  `StartGameScreen` but no API contract test.
- `GET /api/games/all` — used by the manage selector; no dedicated assertion.
- `GET /api/system/wifi/diagnostics` (admin) — no test.
- **Type**: true (minor) gaps; cheap to add to `api-contract.spec.ts`.

---

## Gaps — blocked (no UI or environment-dependent)

### 12. Teams play & seating

- **What**: `gameType: "TEAMS"` is selectable at create and `createParticipant`
  accepts an optional `teamName`, but the `join/` flow does not read `gameType`
  or collect team names, and the director traveller path is pair-oriented.
- **Where**: create `src/app/create/CreateGamePage.tsx`; no team-specific screen
  under `src/app/game/[gameId]/join/`.
- **Blocked**: no distinct Teams play/seating UI, so a true Teams journey (incl.
  `TEAM_MATCH` / `TEAM_OVERALL` leaderboards) cannot be authored yet.

### 13. Scoring-type selection (MP / IMP / Cross-IMP)

- **What**: `scoringType` is stored (`src/db/game-index/schema.ts`, default
  `"MP"`) and consumed at play time, but there is **no create/setup UI** to
  choose IMP or Cross-IMP.
- **Blocked**: covering IMP vs Cross-IMP rendering E2E would need games seeded
  per scoring type, since no selector exists. Scoring math itself is unit-tested
  under `src/scoring/`.

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

### 16. WiFi scan/test SUCCESS + Save-gating on real hardware

- **What**: The real scan/test cycle (hotspot drops, device reconnects, picker
  populates, a successful test of the selected SSID enables Save).
- **Where**: `wifi-settings.journey.ts` covers the capability-aware UI, the
  unavailable page, and admin-gating; the success path needs real `nmcli`/WiFi.
- **Blocked**: requires actual disconnect/reconnect hardware CI cannot perform.
  Verify manually on an appliance. The disabled/gated states are covered
  automatically.

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

## Prioritized action list

Ordered by product risk. Everything here is a **true test gap** (items in the
"blocked" section are excluded — they need UI or hardware first).

**P1 — Director export/publish paths (data leaves the box):**
1. PBN export download + auth + 404 (item 1).
2. BridgeWebs upload: configured-gating, all-results-in gating, happy path
   (network-isolated), failure, auth (item 2).

**P2 — BridgeWebs configuration surface (enables P1 + create picker):**
3. BridgeWebs credentials settings: link, save, admin-gating, "keep password"
   rule (item 3).
4. Create-page BridgeWebs event picker: render, select, name prefill,
   `bridgewebsEventId` persistence (item 4).

**P3 — Player device/session flows:**
5. Seat transfer / Change device round-trip + secret rotation (item 5).
6. Player leave-table (pre-start un-seat) live seat freeing (item 6).
7. Admin logout + validate (settings re-gate) (item 8).

**P4 — Contract/coverage tidy-ups (cheap):**
8. Swiss Teams setup dialog + round draw (item 7, the testable portion).
9. Director-token validate endpoint (item 9).
10. `results-summary`, `start-check`, `/games/all`, `wifi/diagnostics` API
    contracts (item 11).
11. Triage `game:selectMovement` — test or remove if unused (item 10).

**Blocked (needs UI/hardware first, cannot E2E now):** Teams play (12),
scoring-type selection (13), American Whist (14), cloud/subscription (15),
WiFi success on real hardware (16), timer `restart:true` (17).
