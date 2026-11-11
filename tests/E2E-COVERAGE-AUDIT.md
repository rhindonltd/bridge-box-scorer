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
  `swiss-pairs-half-matches`, `swiss-teams`, `swiss-teams-triples`,
  `director-override`, `traveller-live`, `leaderboard-live`, `display-detail`,
  `request-on-mount`, `realtime-internals`, `reconnect`, `timer`,
  `multi-section`, `share-code`, `delete-game`, `usebio`, `pbn`,
  `bridgewebs-upload`, `bridgewebs-create`, `seat-transfer`, `leave-table`,
  `completed-game-redirect`, `admin-key`, `wifi-settings`, `authorization`,
  `director-rulings`, `played-reversed`.

## How the suite runs (read this first)

- **No test can reach a real third party.** The app server is started with
  `BRIDGEWEBS_API_BASE`, `EBU_API_BASE` and `EBU_PARSE_USEBIO_URL` pointing at
  local stand-ins (ports 3999 and 3998, set in `playwright.config.ts`); the
  upload journeys skip unless those point at a loopback host.
- **Isolated environment.** `playwright.config.ts` starts its own server on
  port 3100 against `<repo>/.e2e-data` (see `tests/e2e-env.ts`). Before the
  server boots, `src/scripts/e2e-prepare.ts` wipes that directory (it refuses
  to wipe anything that is not a throwaway dir), runs every migration, seeds the
  admin key and movements, and loads a fixed 24-player EBU directory
  (`src/scripts/e2e-seed/e2e-players.ts`). Real data and the dev server are never
  touched. The server runs the production build, so run `npm run build` first
  (`E2E_REUSE_SERVER=1` reuses an already-running E2E server).
- **Seeded games.** Games are no longer all built through the setup screens.
  `tests/fixtures/seeded-game.ts` (`seedGame`, `seedStartedTwoTableGame`,
  `openDirector`, `openSeat`) creates a game straight into the E2E data dir via
  a child process (`src/scripts/e2e-seed/seed-json.ts`, the same library as
  `npm run seed:e2e`) and plants the director/seat tokens on fresh browser
  contexts. It supports the Pairs-screen scenarios (withdrawals, late arrivals,
  handover, treatments). Journeys whose subject IS the setup screens (create
  form, tables, sections, movement pickers, Swiss setup) still drive the UI.
  `setUpStartedTwoTableGame` in `journeys/support.ts` now delegates to the
  seeder.
- **Fixed product gap surfaced by the suite.** On renumbered-id movements (e.g.
  SPEC 154, the first recommendation for two tables) the leaderboard used to
  list pairs by their movement id ("A4") rather than their names, because the
  leaderboard participants were keyed by seat and the scored lines by movement
  id. Participants now carry the same id as their boards;
  `seeded-game.journey.ts` checks a finished Howell lists every pair by name.

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
- **Game creation**: the two-step wizard (details, then event type and
  opening-lead toggle), blank-details refusal, create success/failure
  (`create-form.journey.ts`); BridgeWebs event picker (`bridgewebs-create`).
- **Director setup**: table resize + evict + shrink guard
  (`table-management.journey.ts`); section add/rename/delete (on the Tables screen) + pills
  (`sections-setup.journey.ts`, `multi-section.journey.ts`); Mitchell + Howell
  select→seat→start→play (`movement-types.journey.ts`); Start Game
  (`fixtures/game-setup.ts`, unit-covered `StartGameScreen`).
- **Player join & seating**: EBU search, seat labels, live seat-occupancy sync
  (`seating-detail.journey.ts`).
- **Player play**: full ContractWizard (level→suit→declarer→lead→made/down→
  confirm), lead ON/OFF, doubled/redoubled, Pass Out, Not Played,
  first-incomplete-round resume, sit-out, game-complete
  (`played-contract`, `contract-variants`, `play-flow`, `sit-out`).
- **Dual-side confirmation**: match→confirm, both mismatch variants + re-enter
  (`mismatch.journey.ts`), sit-out submission rejection.
- **Board deal capture**: player post-round deal entry + director Enter Deals +
  show-hand on traveller (`deal-entry.journey.ts`).
- **Withdrawals, reinstating and late arrivals** (`withdrawals-late.journey.ts`,
  seeded 3-table games): a player withdrawing from their phone (Cancel, then
  withdraw; device signed out; the opponent moved on; Pairs shows "Withdrew in
  round 2"); the director's Withdraw (with Confirm), then Reinstate on a new
  device by single-use code; the AVE−/AVE+ vs Remove choice saving; an empty
  expected-late seat showing "Not arrived", and a latecomer joining it turning
  Late.
- **EBU results submission** (`ebu-upload.journey.ts`): the unconfigured state;
  the whole parse → date check → player check → submit workflow against a local
  stand-in for the EBU (`fixtures/ebu-mock.ts`), asserting the calls, the Basic
  auth, the USEBIO file and the returned check keys; an EBU rejection; the
  duplicate-date and surname-mismatch notes; and bad credentials.
- **EBU settings** (`ebu-settings.journey.ts`): reachable from the menu;
  first-time setup needs a number and a password; saving stores them and never
  shows the password back; changing the number alone keeps the password; behind
  the admin key; and, against the EBU stand-in, that the saved number and
  password are the credentials an upload sends (together, number alone, then
  password alone).
- **Cloud Backup settings** (`cloud-sync-settings.journey.ts`): not-enabled and
  corrupt-status states, "Not yet" / last-backed-up time, the offline /
  not-entitled / error warnings, and "Back up now" (admin token sent, confirmed,
  debounced; expired session returns to the admin prompt). The box's status file
  is a file in the E2E data dir (`CLOUD_SYNC_STATUS_PATH`), and the privileged
  "back up now" request is intercepted in the browser, so nothing is ever
  triggered on the host.
- **Scoring through the real screens** (`scoring-ximp`, `scoring-teams`,
  `scoring-neuberg`, `scoring-invariants`). Games are seeded with hand-picked
  results (the seeder's `outcomes`, `holdBack` and `finish` options) so every
  expected figure is worked out by hand and recorded beside the assertion
  (`fixtures/scoring-scenarios.ts`); a few boards are then played by real pairs
  through the app and their scored traveller read back.
  - *Cross-IMPs (pairs):* the NS/EW standings to two decimals, a board's
    traveller (each line's cross-IMPs, cancelling to zero), a director's
    correction re-scoring a mounted display live, a withdrawn pair under the
    default AVE-/AVE+ (-3 / +3 per missed board) and under Remove, and choosing
    Cross-IMPs on the create form.
  - *Teams:* IMP (Aggregate) per-round and total net IMPs; Board-a-Match and
    Point-a-Board shares with a shared first place; IMP (Victory Points) with a
    10-10 tie, a 20-0 blitz and two published-table values over 5 boards (a 10
    IMP margin is 15-5, a 9 IMP margin 14-6); the director traveller's per-match
    IMP swing; the create form's Teams scoring list (IMP, IMP Victory Points and
    the region's board-comparison method) and saving each choice.
  - *Matchpoints and Neuberg (§4.2.3.2):* exact standings with and without
    short boards, and a short board played live (the traveller shows the board's
    own field; the scaling to the full top is applied in the standings).
  - *Invariants:* on the default spread of results, matchpoint shares average
    50%, cross-IMPs cancel, aggregate IMPs are zero-sum, board-comparison shares
    average 50%, every VP match totals 20, and every ranking is consistent with
    its own figures.
- **Stationary pairs in Swiss Pairs** (`swiss-stationary.journey.ts`): marking
  a pair stationary mid-event applies to the next draw (the pair is back at its
  home seat in round 3) and leaves the rounds already drawn untouched; the
  choice persists across reloads; the amber marker shows and the pair can be
  unmarked again. (The pairing/seating rules are unit-tested in
  `swiss-pairing.test.ts`; the per-round history in `selected-movement.test.ts`.)
- **Setup around the movement** (`setup-details.journey.ts`): Edit Event
  Details (rename; scoring change asks first and clears the movement); the
  expected-late rules on the Start Game screen; splitting a section with pairs
  seated, where a waiting device follows its renumbered seat.
- **Handover and substitutions**: player-driven Menu → Handover on the same
  device and on a different device (code claimed from the join screen, old
  device signed out), and the director's split / main pair / eligibility
  choices on the Pairs screen (`handover-same-device`,
  `handover-different-device`, `substitutions`, using a seeded handover).
- **Seeded-game fixture**: planted director/seat tokens open the manage and
  play screens, and a seeded withdrawal shows on the Pairs screen
  (`seeded-game.journey.ts`).
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
- **Swiss Teams triples** (odd field): set up a Swiss Teams game with a per-round
  triple plan, seat an odd (three-team) field, and run both flavours — a **SHORT**
  triple (the whole three-way in one round) scored and credited to all three
  teams, and a **LONG** triple drawn across two rounds (round 2 reuses the same
  three teams, scored, and credited) (`swiss-teams-triples.journey.ts`).
- **Director overrides**: played-contract override, adjusted-score (custom +
  preset), propagation to player + second director
  (`director-override.journey.ts`, `traveller-live.journey.ts`).
- **Director rulings** (`director-rulings.journey.ts`, seeded complete games):
  the adjustment hub offers exactly the rulings for each game type (plain
  pairs, Teams, Swiss Pairs, Swiss Teams); Cancel / Foul Board assigns the
  chosen average to that row only; Board Not Played (Teams) moves 3 IMPs to the
  side not at fault (one VP each way in the seeded match, other matches
  untouched); Void Match (Teams) credits a flat 8 VP each (12 when the TD was at
  fault) and leaves every other match alone; Void Match (Pairs) compensates the
  non-offending pair and keeps the round's VP total at 20 a match.
- **Board played the wrong way round** (`played-reversed.journey.ts`, seeded
  complete pairs game; `authorization.journey.ts` for the socket event): the
  hub offers Mark Played Reversed, the director traveller then shows that
  row's NS and EW pairs exchanged with the result unchanged, the hub offers
  Clear Reversed instead, and clearing restores the original row. The score
  credit itself (Mitchell two-winner, Swiss Pairs, teams VP, USEBIO) is covered
  by the `*-seat-swap` service integration tests, not the journey. Not covered
  end to end: the leaderboard and player-side board result screens after a
  swap, and a teams game.
- **Export & Publish hub** (`export-hub.journey.ts`): the manage-menu button →
  readiness checklist (results / club / BridgeWebs / EBU, each Ready, Warning,
  Not ready or Optional and the summary line); an outstanding board listed
  behind a tap with the pairs seated for it (the `outstanding-boards` API);
  Continue → options, with USEBIO and the uploads waiting for the last result,
  PBN always available, and unconfigured uploads hidden. Device settings are
  answered in the browser so the shared server's settings don't matter.
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

### 18. Swiss §3.5 mismatch review — CLOSED

- **Covered by** `swiss-mismatch-review.journey.ts`: draw and score round 2,
  correct round 1 the other way round through the director traveller, then
  Manage > Review Mismatches lists the candidates (round, table, pair, the
  opponent met and the corrected one, their VP and the gap); applying a
  "stronger opponent, not their fault" candidate compensates only that pair's
  round VP (10 → 12.5, §3.5.2), the round's other candidates stay listed, and
  ruling the same pair's opponent as well ("weaker opponent, own fault",
  10 → 9) keeps both rulings; dismissing one changes no score.
- **Was blocked by** a Swiss Pairs identity defect, now fixed: round 1 was
  recorded under each pair's seat ("A1NS") and later rounds under its stable
  number ("A1"), so standings listed every pair twice, the next draw ranked on
  split standings, and detection never fired. Round 1 now uses the stable
  numbers (unit-tested in `swiss-pairs-identity.int.test.ts`), and leaderboard
  participants are keyed on the same id as their boards (which also fixes the
  bare "A4" names on Howell movements).
- **Fixed with it:** applying one candidate used to hide the whole round's
  other candidates, and a match could hold only one mismatch ruling, so
  ruling a pair's opponent overwrote the first ruling. Now a match holds a
  ruling for each side, both Swiss scorers apply each, and only the ruled
  pair/team drops out of the review (unit-tested in `swiss-mismatch.test.ts`,
  `detect-swiss-mismatch-service.int.test.ts` and `ruling-scoring.int.test.ts`).

### 19. Still uncovered (no blocker)

- The player's Team Results tab / Teams round-results page.
- Mitchell variants (skip, share-and-relay, hesitation, web, arrow-switch).
- The standard (non-Swiss) Movement page and changing a movement mid-game.
- Scoring edge cases: small-field fixed percentages (§4.2.3.3, unit-tested),
  sit-out credit, a half-match round with stationary pairs.
- Appliance actions (restart / reboot / reset WiFi — contract only, never run),
  captive portal, updates.
- Accessibility checks (axe) and locale handling.

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
