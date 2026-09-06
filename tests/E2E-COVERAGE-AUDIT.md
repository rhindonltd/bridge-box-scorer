# E2E Test Coverage Audit — Bridge Box Scorer

## Purpose

This document is a comprehensive audit of end-to-end (E2E) test coverage for the
Bridge Box Scorer app. It inventories **all** functionality that E2E tests
should cover — user-facing browser/journey flows and Playwright request-context
API + socket-level behaviours — and marks each item as covered, a gap, or
partially covered. It is intended to double as a working TODO for closing the
holes.

Scope is everything under `tests/`: the Playwright browser specs
(`*.spec.ts`), the multi-device journeys (`tests/journeys/*.journey.ts`), and
the request-context API/socket tests.

## Legend

- `- [x]` — **Covered**: an existing test exercises this behaviour.
- `- [ ]` — **Gap**: no test currently exercises this behaviour.
- `- [ ]` prefixed with `(PARTIAL)` — **Partially covered**: some aspect is
  tested but meaningful scenarios are missing; the note says what is and isn't
  covered.

## How coverage was assessed

Every spec, journey, and fixture in `tests/` was read and mapped against the
full application surface:

- All routes under `src/app` (root, `create`, `join`, `manage`, `game`,
  `display`, `settings` and their sub-routes).
- All HTTP `route.ts` handlers under `src/app/api`.
- All Socket.IO events and handlers under `src/socket`
  (`socket-events.ts`, `socket-event-map.ts`, `handlers/`, `middleware/`).

Existing test files consulted: `smoke.spec.ts`, `api.spec.ts`,
`game-api.spec.ts`, `club-settings.spec.ts`, `settings.spec.ts`,
`settings-menu.spec.ts`, `results-live.spec.ts`, `timer.spec.ts`, and the
journeys `leaderboard-live.journey.ts`, `traveller-live.journey.ts`,
`request-on-mount.journey.ts`, `played-contract.journey.ts`,
`mismatch.journey.ts`, `sit-out.journey.ts`,
`contract-variants.journey.ts`, `director-override.journey.ts`,
`share-code.journey.ts`, `multi-section.journey.ts`,
`movement-types.journey.ts`, `table-management.journey.ts`,
`timer.journey.ts`, `reconnect.journey.ts`, `admin-key.journey.ts`,
`wifi-settings.journey.ts`, `usebio.journey.ts`. Fixtures: `game-create`,
`game-setup`, `join`, `play`, `director-override`, `delete-game`, `settings`,
`complete-game`.

### Test tooling that already exists (fixtures)

These helpers exist and can be reused to build new coverage without new
scaffolding:

- Create a game, optionally with opening-lead recording off
  (`fixtures/game-create.ts` — `recordOpeningLead`).
- Set table count, pick first recommended movement, start game
  (`fixtures/game-setup.ts`).
- Set up a started two-table game, optionally lead-off
  (`journeys/support.ts` `setUpStartedTwoTableGame`).
- Set up a started TWO-SECTION game (section CRUD + per-section movement +
  seat both sections) (`journeys/support.ts` `setUpStartedTwoSectionGame`).
- Seat a two-table field via EBU player search (`fixtures/join.ts`); seat an
  explicit section-qualified seat (`seatPairBySeat`, `seatTwoTableSection`); or
  seat a full N-table single section (`seatSingleSectionField`).
- Pick a recommended movement by name (`game-setup.ts` `pickMovementByName`).
- Confirm every board of a started game (all results in) via a direct socket
  (`fixtures/complete-game.ts` `confirmEntireGame`).
- Derive the device admin key + mint an admin token (`fixtures/settings.ts`).
- Enter a Pass Out and confirm a board via both sides (`fixtures/play.ts`).
- Enter a full played contract (incl. doubling and made/down results) and
  confirm it via both sides (`fixtures/play.ts` — `enterPlayedContract`,
  `confirmBoardPlayedContract`, `enterContractRaw`, `ContractSpec`).
- Enter a "Not Played" outcome and confirm it via both sides
  (`fixtures/play.ts` — `enterNotPlayed`, `confirmBoardNotPlayed`).
- Open a director traveller and override a row to 1NT, to any played contract
  (`overrideRowToContract`), or to an adjusted score (`overrideRowToAdjusted`)
  (`fixtures/director-override.ts`).
- Delete a game (`fixtures/delete-game.ts`).
- Seed a valid admin session token to unlock settings
  (`fixtures/settings.ts`).

---

## 1. App entry & navigation

- [x] Main menu renders with a "Join Game" navigation link (`smoke.spec.ts`).
- [ ] Main menu shows all primary links: Join, Create, Manage, Display.
- [ ] Main menu Settings cog navigates to `/settings`.
- [x] `/join` page loads (body not empty) (`smoke.spec.ts`).
- [x] `/create` page is reachable (URL matches `/create`) (`smoke.spec.ts`).
- [x] `/settings` page loads (body not empty) (`smoke.spec.ts`).
- [ ] `/manage` game selector loads (fetches all games, not just joinable).
- [ ] `/display` game selector loads.
- [ ] `SelectGame` empty state renders "No games have been created yet." when
  no games exist.
- [ ] `SelectGame` loading spinner shown while the list loads.
- [ ] `SelectGame` rows show event name, formatted date, table count.
- [ ] Selecting a game from `/join` navigates to `/game/{id}/join`.
- [ ] Selecting a game from `/display` navigates to `/game/{id}/display`.
- [ ] Selecting a game from `/manage` as the local director → `/game/{id}/manage`.
- [ ] Selecting a game from `/manage` when NOT the director shows the inline
  `ClaimDirectorCode` path.
- [ ] `not-found` (unknown route / unknown game) renders the not-found screen.
- [ ] `error` boundary renders when a page throws.
- [ ] Joinable-games list live-updates over `SocketEvents.JOINABLE_GAMES`.
- [ ] Joinable-games list re-fetches on socket reconnect.

---

## 2. Game creation (`/create`)

- [ ] Event Name field accepts input.
- [ ] Director Name field accepts input.
- [ ] Event Type selector offers Pairs and Teams.
- [ ] Date Played defaults to today and is editable.
- [ ] "Record Opening Lead" toggle (default Yes) can be switched.
- [ ] Create with valid input → navigates to `/game/{id}/create`
  (implicitly exercised by journey setup, but not asserted as a create-form
  test on its own).
- [ ] (PARTIAL) Create is driven by fixtures (`fixtures/game-create.ts`) inside
  journeys, but there is no dedicated test of the create FORM behaviour
  (fields, toggle, event type). Only the resulting navigation is relied upon.
- [ ] No-validation edge: blank Event Name / Director Name are accepted (submit
  succeeds).
- [ ] Create failure shows the inline red error "Failed to create game. Please
  try again." and re-enables the button.
- [ ] Submit button shows "Creating…" while in flight.

---

## 3. Director setup — Tables

- [x] NumberStepper increments/decrements table count (emits `UPDATE_TABLES`);
  the count changes up and back down (`table-management.journey.ts`).
- [x] Evict pair: confirm dialog → `EVICT_PARTICIPANT` frees the seat
  (`table-management.journey.ts`).
- [ ] Evict failure shows the alert.
- [x] Remove-table rule: shrinking a section that still seats a pair on the
  last table is rejected (count stays); the guard is server-enforced
  (`table-management.journey.ts`).
- [ ] Start-check problems list (amber, bulleted) shown when the game cannot
  start.
- [ ] One-pair-short → "One pair short — {seat} will sit out each round."
- [x] (PARTIAL) Start Game succeeds once movement + full seating are valid
  (`fixtures/game-setup.ts` `startGame`; used by every live journey). The
  disabled→enabled gating itself is asserted only via `toBeEnabled` before
  click, not the disabled state or the problem messages.
- [ ] Participants live-sync over `SocketEvents.PARTICIPANTS` as pairs are
  seated/evicted.

---

## 4. Director setup — Sections

- [ ] Add Section creates a new section with the next free letter.
- [ ] Rename Section updates the section label.
- [ ] Delete Section removes a section.
- [ ] Delete control hidden when only one section exists.
- [ ] Single-section vs multi-section rendering differences (headings/labels
  hidden in single-section).
- [ ] Per-section movement summary text ("Mitchell — N tables, M rounds" /
  "No movement selected").
- [ ] Single-section movement picker shows the amber "Add Section" banner.

---

## 5. Director setup — Movement

- [x] First recommended movement is selectable (`fixtures/game-setup.ts`
  `pickFirstMovement`; used by journeys).
- [x] Standard Mitchell (generated, 3 tables) selected by name, seated, started
  and played (`movement-types.journey.ts`, `pickMovementByName`).
- [x] Howell (2-table Full Howell) selected by name, seated, started and played
  (`movement-types.journey.ts`).
- [ ] **American Whist — NOT selectable via the picker.** It is absent from the
  recommendation spec map (`recommendation-spec-map.json`), so the movement
  picker never offers it at any table count (verified 2–8 tables + the full
  map). This is a product gap, not a test gap: there is no UI path to select
  American Whist, so it cannot be E2E-tested through setup.
- [ ] Recommendations are grouped by boards-a-pair-plays.
- [ ] Empty state: "No recommended movements are available for this table count
  yet."
- [ ] Movement selection failure shows the alert.
- [x] `GET /api/movements/pairs/{1,2,4}` returns a movement array
  (`api.spec.ts`).
- [x] Movement list item shape has `id` and `name` (`api.spec.ts`).
- [x] `GET /api/movements/detail/PAIRS/{id}` returns detail with `tables`,
  `type: "PAIRS"` (`api.spec.ts`).
- [x] `GET /api/movements/detail/INVALID_TYPE/1` returns 400 (`api.spec.ts`).
- [ ] `GET /api/movements/pairs/0` (or non-positive) returns 400 "Invalid table
  count".
- [ ] `GET /api/movements/detail/PAIRS/{unknown-id}` returns 404 "Movement not
  found".

---

## 6. Player join & seating

- [x] (PARTIAL) Seat a two-table pairs field via the join UI
  (`fixtures/join.ts` `seatTwoTableField`; used by journeys). This exercises
  table/direction pick, EBU search by number, result select, and Enter Pair.
- [ ] `SelectTable` shows sections/tables with occupied seats reflected live.
- [ ] Tapping a free seat opens the `EnterPlayerNames` sheet with the correct
  labels (North/South for NS, East/West for EW).
- [ ] EBU `PlayerSearch` "Searching…" state while a query is in flight.
- [ ] EBU search result list renders matches.
- [ ] Selected player shows the green card with EBU id and an X to clear.
- [ ] "Enter Pair" disabled until both players are chosen.
- [ ] `createParticipant` (type PAIR) succeeds and navigates to the play seat.
- [ ] Occupied-seat live sync over `SocketEvents.PARTICIPANTS` in the seating
  view.

---

## 7. Player play — ContractWizard

- [x] Pass Out entry via the wizard (`fixtures/play.ts` `enterPassOut`).
- [x] Real played contract entry: full walk level → suit → declarer → (lead) →
  made/down → confirm → submit (`played-contract.journey.ts`,
  `fixtures/play.ts` `enterPlayedContract`; e.g. 4♥ by North making).
- [x] Step 0: board selection (`wizard-board-{n}`; played boards disabled).
- [x] Step 1: level selection (exercised via `enterPlayedContract`).
- [x] Step 1: special outcome "Pass Out" (PO) short-circuits to Confirm
  (`fixtures/play.ts` `enterPassOut`).
- [x] Step 1: special outcome "Not Played" (NP) short-circuits to Confirm and
  confirms via both sides (`contract-variants.journey.ts`,
  `fixtures/play.ts` `confirmBoardNotPlayed`). Note: an NP board has no
  matchpoint score, so it renders no scored traveller row.
- [x] Step 2: suit selection (exercised for a suited contract, 4♥).
- [x] Step 3: declarer selection (North exercised).
- [x] Step 3: doubling toggle — doubled (X) and redoubled (XX) contracts are
  entered and shown in the traveller (`contract-variants.journey.ts`).
- [x] Step 4: opening lead shown when `leadCardRequired` — walked in the
  lead-ON variant of `played-contract.journey.ts`.
- [x] Step 4: lead step absent when recording is OFF — the lead-OFF variant
  (created via `recordOpeningLead:false`) reaches confirm with no lead step,
  proving the wizard skips it (`played-contract.journey.ts`).
- [x] (PARTIAL) Step 5: Made result — `=` (making exactly) and `+1` exercised
  (mismatch journey uses 4♥+1). Full made range not enumerated.
- [x] (PARTIAL) Step 5: Down result — `-2` exercised via a redoubled 3NT going
  down (`contract-variants.journey.ts`). Full down range not enumerated.
- [x] Step 6: Confirm + Submit for a played contract (`wizard-submit`).
- [ ] Board dropdown (sub-header) switches the board being entered after step 0.

---

## 8. Player play — flow states

- [x] (PARTIAL) `roundInfo`: "Enter Round" advances (`play-enter-round`,
  exercised throughout). Player/board detail on the screen is not asserted.
- [x] Sit-out round → `SitOutPage` ("Sit Out", Continue advances)
  (`sit-out.journey.ts`).
- [x] (PARTIAL) `waiting` → `WaitingForConfirmation` shown after the first side
  submits (asserted in `traveller-live.journey.ts` / `fixtures/play.ts`).
- [x] `mismatch` state rendered — both variants (`mismatch.journey.ts`).
- [x] Re-enter path from mismatch returns to contract entry and re-confirms
  (`mismatch.journey.ts`).
- [x] `boardResults` reached after confirmation ("Board Results" visible).
- [x] `BoardSelector` pages back to an earlier played board in the round: with
  two boards confirmed, the "Board 2" dropdown selects "Board 1" and the
  traveller re-renders (`contract-variants.journey.ts`).
- [x] (PARTIAL) `moveInfo` advanced during the play-to-completion walk
  (`played-contract.journey.ts`). The "Move to Table N" content is not asserted.
- [x] `gameComplete`: reached by playing the whole game; "Game Complete"
  renders (`played-contract.journey.ts`).
- [x] Game-complete final leaderboard highlights the finishing pair's OWN row:
  the row with `data-highlighted="true"` contains that pair's assignment id
  (`played-contract.journey.ts`; assertion enabled by a `data-highlighted`
  attribute added to `TableRow`).
- [ ] Play page resolves to the first incomplete round (skips confirmed rounds
  and sit-outs) on mount.

---

## 9. Dual-side confirmation & disputes

- [x] Match → confirm: matching Pass Outs from both sides confirm the board and
  emit `BOARD_CONFIRMED`; NS page flips from waiting to Board Results
  (`fixtures/play.ts` `confirmBoardPassOut`, used by journeys).
- [x] Mismatch variant A — different BOARD numbers entered by the two sides
  ("different boards" copy) (`mismatch.journey.ts`).
- [x] Mismatch variant B — same board, different RESULT ("different results"
  copy) (`mismatch.journey.ts`).
- [x] Mismatch shows NS-entered vs EW-entered contracts (`mismatch.journey.ts`).
- [x] "Re-enter Result" returns to contract entry, and matching re-entry
  confirms the board (`mismatch.journey.ts`).
- [x] Sit-out submission rejected with "This board is a sit-out"
  (`sit-out.journey.ts`, asserted over a direct socket ack).
- [x] (PARTIAL) Partial submission: NS stays in "Waiting for confirmation"
  until EW submits (asserted implicitly in every confirm/mismatch flow). A
  duplicate-submission edge is not separately tested.

---

## 10. Director result correction / overrides

- [x] Director opens a board's traveller before play; row shows "—"
  (`traveller-live.journey.ts`).
- [x] Director's open traveller updates live to the confirmed result
  (`traveller-live.journey.ts`).
- [x] Director override of a row → 1NT, propagated live to a mounted player
  Board Results page (`traveller-live.journey.ts`,
  `fixtures/director-override.ts`).
- [x] Director override of a **played contract** — a suited, doubled contract
  (3♠ X by North) via `DirectorContractWizard`, propagated live to the player
  (`director-override.journey.ts`, `fixtures/director-override.ts`
  `overrideRowToContract`).
- [x] (PARTIAL) Adjusted-score override — custom NS%/EW% (60/40) entered and
  the director traveller renders "Adj 60%/40%"
  (`director-override.journey.ts`, `overrideRowToAdjusted`). Note: an adjusted
  score has no matchpoint score, so it shows in the DIRECTOR traveller, not the
  player's scored (MP) traveller. Preset buttons not separately exercised.
- [ ] Adjusted-score presets (AVE 50/50, 60/40, …) as distinct button clicks.
- [x] Select-board → traveller flow with tappable rows (exercised throughout
  the override journeys via `openDirectorTraveller`).
- [ ] Empty-state "No results for this board yet" on the director traveller.
- [ ] `OVERRIDE_RESULT_TRAVELLER` "Saving override…" spinner and error banner
  path.
- [ ] Override propagates to OTHER viewers (leaderboard + another traveller
  viewer), not only the acting director.

---

## 11. Real-time correctness

- [x] Request-on-mount: a leaderboard opened before any result resolves past
  the spinner and renders its header (`results-live.spec.ts`).
- [x] Request-on-mount: a late-opened leaderboard and a late-opened director
  traveller show already-confirmed results (`request-on-mount.journey.ts`).
- [x] (PARTIAL) Occupancy-gated broadcasts implicitly exercised (a mounted
  display receives the live push in `leaderboard-live.journey.ts`). The
  no-viewer/no-compute optimisation itself is not directly asserted.
- [x] Reconnect re-fetch: a leaderboard display dropped via `context.setOffline`
  and restored recovers its standings (request-on-`connect`) and resumes live
  updates (`reconnect.journey.ts`).
- [ ] `game:join` does NOT replay feature state (joining is a dumb room-join).
- [ ] `useSocketSWRSync` merges a mapped socket event into the SWR cache
  without revalidation.

---

## 12. Timer — config

- [x] `timer:saveConfig` persists a "configured but not started" state, then
  **promote-on-start** turns it into a live timer at game start (the display,
  opened after start, shows "Round 1 of 3") (`timer.journey.ts`).
- [ ] Timer configured in the `/create` Timer tab (config-only) — the
  `/manage/timer` config path is covered; the create-flow tab is not separately.
- [ ] Breaks: adding a break shows the break screen on the display (was covered
  by the removed `timer.spec.ts`; not yet re-added to `timer.journey.ts`).
- [ ] Invalid break-timing alert ("Break timing is invalid") with per-break
  overrun detail.
- [ ] Session-length preview reflects config.
- [ ] Multi-section "Apply to all sections" writes config to every section.

---

## 13. Timer — live controls

- [x] Start / Pause toggle propagates to the display (PAUSED shown/hidden)
  (`timer.journey.ts`).
- [x] Next phase advances (Move for Round 2 shown) (`timer.journey.ts`).
- [x] Previous phase steps back into a round's play, via the "‹ Prev" button
  (`timer.journey.ts`). NOTE: the live "‹ Prev" button only ever sends
  `previousPhase`; the handler's documented two-step "first press restarts the
  phase" (`restart: true` → `restartPhase`) is **not wired to any UI button**,
  so previous-restart is unreachable through the UI (engine `restartPhase` is
  unit-tested in `bridge-timer-engine.test.ts`). `restartPhase` resets only the
  current phase to full time — not a whole-timer reset.
- [x] Adjust time (+1m) changes the displayed remaining on the running/paused
  timer (`timer.journey.ts`).
- [ ] Adjust time with "apply to all subsequent phases of this type" checkbox.
- [x] `updateConfig` / "Apply Changes": changing play duration applies to the
  next play phase (round 2 shows the new 00:20) (`timer.journey.ts`). NOTE: the
  CURRENT phase keeps its already-adjusted remaining — updateConfig affects
  subsequent phases, which the test asserts.
- [x] Promote-on-start: a timer configured (saved) before start begins at game
  start (`timer.journey.ts`).
- [ ] Live status panel (phase, remaining, round, projected end) values.

---

## 14. Timer — display

- [x] Display syncs to a timer created AFTER the display opened (request-on-
  mount, not `game:join` replay) (`timer.spec.ts`).
- [x] Round label ("Round 1 of 3") and PAUSED state render (`timer.spec.ts`).
- [x] Countdown shows MM:SS while running (`timer.spec.ts`).
- [ ] "Connecting…" placeholder before the first timer state arrives.
- [ ] 1-second local countdown tick between server syncs.
- [ ] Multi-section `SectionChooser` ("Choose a section") + "← Sections" back.
- [ ] Single-section skips the chooser.
- [ ] `serverNow` clock-offset correction keeps the display accurate.

---

## 15. Leaderboard display

- [x] Empty state: standings table renders with zero rows before any board is
  played (`leaderboard-live.journey.ts`).
- [x] Standings gain rows live when a board is confirmed
  (`leaderboard-live.journey.ts`).
- [x] `leaderboard-standings` / `leaderboard-row` test hooks render
  (`leaderboard-live.journey.ts`, `request-on-mount.journey.ts`).
- [ ] `leaderboard-empty` ("No Results Yet") explicit empty-state copy.
- [ ] Combined vs per-section pill tabs (multi-section); default Combined.
- [ ] Single-section hides the tabs.
- [ ] Pairs plugin leaderboard view rendering.
- [ ] Team leaderboards: `TEAM_MATCH` variant.
- [ ] Team leaderboards: `TEAM_OVERALL` variant.

---

## 16. Traveller display

- [x] Traveller row renders the confirmed result live on confirm
  (`traveller-live.journey.ts`).
- [x] Traveller row updates live on director override
  (`traveller-live.journey.ts`).
- [ ] Traveller empty state ("No results for this board yet").
- [ ] Scored traveller rendering (per-board scoring plugin) with the player's
  own row highlighted.

---

## 17. Share director access

- [x] Share code generated on mount and readable (`share-code.journey.ts`;
  a `data-testid="share-code"` was added to the code element).
- [ ] 5-minute countdown shown as mm:ss.
- [ ] Expiry → "Code expired." with a regenerate button.
- [ ] "Generate New Code" produces a fresh code.
- [ ] Generation error line shown when generation fails.
- [x] Claim input: uppercase, 6-char, submit disabled until length ≥ 6
  (unit-tested in `ClaimDirectorCodeView.test.tsx`; exercised in the journey).
- [x] Valid claim → mints a director session → navigates to `/game/{id}/manage`
  (`share-code.journey.ts`).
- [x] (PARTIAL) Claim error "Invalid code" (`share-code.journey.ts`).
  "Already used" / "expired" variants not separately exercised.
- [x] Full co-director round-trip: generate on device A, claim on device B, B
  can then manage the game (director-only actions visible)
  (`share-code.journey.ts`).
- [x] **Bug found & fixed via this journey:** selecting a non-director game on
  `/manage` crashed with "useGame must be used within GameProvider" because
  `ClaimDirectorCodeView` used `GamePageLayout` (whose header calls
  `useRequiredGame`) outside a `GameProvider`. Switched it to `PageLayout`.

---

## 18. Delete game

- [x] (PARTIAL) Delete via the manage menu (Delete Game → Yes, Delete Game) is
  used for journey cleanup (`fixtures/delete-game.ts`). It is best-effort
  teardown, not an assertion that deletion succeeded.
- [ ] Confirmation screen names the event being deleted.
- [ ] On success the director token is cleared and the app navigates away.
- [ ] Delete failure shows the inline error ("Failed to delete game" / "Network
  error. Please try again.").
- [ ] Buttons show "Deleting…" and disable while in flight.
- [ ] `DELETE /api/games/{id}/delete` is director-authed (token in JSON body);
  unauthorized without a valid token.

---

## 19. USEBIO export

- [x] `GET /api/games/nonexistent/usebio` returns 404 (`api.spec.ts`,
  `usebio.journey.ts`).
- [x] USEBIO download happy path: complete the game, confirm club info, download
  the XML blob (filename ends `.xml`, non-empty content)
  (`usebio.journey.ts`, using `fixtures/complete-game.ts`).
- [x] Required-field validation: "Both club name and number are required"
  (`usebio.journey.ts`).
- [ ] "Download USEBIO" hidden until the game has started / disabled until all
  results are in (`allResultsIn`) — enforced at the manage menu; the journey
  completes the game before downloading rather than asserting the disabled state.
- [ ] API 400 when club info is not configured ("Club info not configured…").
- [x] `GET /usebio` is director-authed — **bug found & fixed via this journey.**
  The route used `withDirectorRoute` (token in the JSON body), but the client
  does a GET with no body, so the download always failed with "Invalid JSON
  body". `withDirectorRoute` now also accepts the token via the
  `x-director-token` HEADER, and the download page sends it. Verified in
  `directorRoute.test.ts` (header + body paths) and end-to-end in
  `usebio.journey.ts`.

---

## 20. Settings & device

- [x] Settings menu heading + WiFi/Club links visible and navigate
  (`settings-menu.spec.ts`).
- [x] Club page UI: heading, Club Name, EBU Club Number, Save, Back
  (`club-settings.spec.ts`).
- [x] `GET /api/system/club` returns club data shape (`club-settings.spec.ts`).
- [x] `POST /api/system/club` saves; missing field → 400; save persists on GET
  (`club-settings.spec.ts`).
- [x] WiFi page UI: heading, network selector, password field, Test Connection,
  Save & Apply disabled initially, Test disabled without a network, dropdown
  placeholder (`settings.spec.ts`).
- [x] Admin-key gate (`AdminKeyEntry`) blocks settings until unlocked: the real
  (MAC-derived) key unlocks it; a wrong key shows "Incorrect admin key" and
  stays gated (`admin-key.journey.ts`).
- [x] Admin-key verify success mints a token; wrong key → 401; missing → 400
  (`admin-key.journey.ts`).
- [x] Update admin key (`POST /api/system/admin-key`): a full change cycle
  (change → new key verifies, old rejected → restore original) plus < 4 chars →
  400 and no-token → 401 (`admin-key.journey.ts`, guarded restore).
- [x] WiFi capability: `POST /api/system/wifi/scan` returns `{ available, ssids }`;
  on a device without `nmcli` the UI shows a "WiFi can't be changed" page
  (`wifi-settings.journey.ts`, `settings.spec.ts`). **Product improvement made
  here:** scan/test/save now degrade gracefully (200 + `available:false` /
  clear error) instead of a 500 when `nmcli` is absent.
- [ ] WiFi test SUCCESS + Save-gating (test-of-same-SSID enables Save) — needs a
  real WiFi association; only reachable on an `nmcli` host (the picker test is
  skipped without it). The scan-availability, unavailable-page, and gated-Save
  (disabled) states are covered.
- [ ] WiFi restarting page shown after save.
- [x] Save WiFi (`POST /api/system/wifi`) is admin-gated; returns 200
  `{success:false}` when WiFi management is unavailable (route unit tests).
- [ ] Network read (`GET /api/system/network`) returns current/saved SSID.
- [x] `POST /api/system/restart` responds (`api.spec.ts`).
- [ ] `POST /api/system/reset-wifi` admin route.
- [ ] `POST /api/system/reboot` admin route.

---

## 21. Auth & authorization

- [ ] Director-only socket events reject a missing/invalid token with
  `{success:false,error:"Unauthorized"}` (e.g. `game:start`,
  `game:evictParticipant`, `game:updateTables`, section events,
  `game:generateShareCode`, `traveller:overrideResult`, timer mutations).
- [ ] HTTP director routes return 401 without a valid `directorToken` in the
  body (`DELETE /delete`, `GET /usebio`).
- [ ] Admin routes return 401 without a valid `x-admin-token` header.
- [ ] **SECURITY GAP** — `game:submitResult` has NO director auth: any
  connected client can submit results. Worth an explicit test.
- [ ] **SECURITY GAP** — `game:createParticipant` has NO director auth: any
  client can add participants.
- [ ] **SECURITY GAP** — `POST /api/system/club` is NOT admin-gated despite
  being a device setting.
- [ ] `game:claimDirectorCode` is intentionally unauthenticated (claimant has
  no token yet) — assert it works without a token but rejects bad codes.

---

## 22. HTTP API contract tests

### Games

- [x] `GET /api/games/joinable` returns a games array + correct shape
  (`api.spec.ts`).
- [x] `GET /api/games/[id]` unknown → 404 "Game not found" (`api.spec.ts`,
  `smoke.spec.ts`).
- [ ] `GET /api/games/[id]` existing → returns the game.
- [ ] `GET /api/games/all` returns all games.
- [ ] `GET /api/games/[id]/participants` returns pairs.
- [ ] `GET /api/games/[id]/movement?section=` returns movement (with optional
  section).
- [ ] `GET /api/games/[id]/sections` returns section list with movement.
- [x] `GET /api/games/nonexistent/boards` → 404 (`game-api.spec.ts`).
- [ ] `GET /api/games/[id]/boards` existing → distinct board numbers.
- [x] `GET /api/games/nonexistent/boards/1` → 404 (`game-api.spec.ts`).
- [ ] `GET /api/games/[id]/boards/[n]` existing → instances.
- [ ] `GET /api/games/[id]/boards/[non-int]` → 400 "Invalid board number".
- [x] `GET /api/games/nonexistent/movement` → 404 (`game-api.spec.ts`).
- [x] `GET /api/games/nonexistent/schedule/1NS` → 404 (`game-api.spec.ts`).
- [ ] `GET /api/games/[id]/schedule/[seat]` existing → schedule; unknown seat →
  404 "Schedule not found".
- [ ] `GET /api/games/[id]/results-summary`.
- [ ] `GET /api/games/[id]/start-check`.
- [ ] `GET /api/games/[id]/usebio` director-authed happy path (see §19).
- [ ] `DELETE /api/games/[id]/delete` director-authed (see §18).

### Movements

- [x] `GET /api/movements/pairs/{1,2,4}` + item shape (`api.spec.ts`).
- [x] `GET /api/movements/detail/PAIRS/{id}` (`api.spec.ts`).
- [x] `GET /api/movements/detail/INVALID_TYPE/1` → 400 (`api.spec.ts`).
- [ ] `GET /api/movements/pairs/{invalid}` → 400 "Invalid table count".
- [ ] `GET /api/movements/detail/PAIRS/{unknown}` → 404 "Movement not found".

### Players

- [x] `GET /api/players/search?q={ebu}` matches by EBU number (`api.spec.ts`).
- [x] `GET /api/players/search?q={no-match}` → empty array (`api.spec.ts`).
- [x] `GET /api/players/search?q=a` (< 2 chars) → empty array (`api.spec.ts`).
- [ ] `GET /api/players/search?q={non-digit}` → empty (name search is absent;
  only digit queries hit the DB).

### System

- [x] `GET /api/system/club` (`club-settings.spec.ts`).
- [x] `POST /api/system/club` save / 400 / persistence (`club-settings.spec.ts`).
- [x] `POST /api/system/restart` responds (`api.spec.ts`).
- [ ] `POST /api/system/admin-key/verify` success (token) / 401 wrong key /
  400 invalid.
- [ ] `POST /api/system/admin-key` update / 400 < 4 chars / 401 without token.
- [ ] `GET /api/system/network`.
- [ ] `POST /api/system/wifi/scan`.
- [ ] `POST /api/system/wifi` (admin-gated) / 400 invalid.
- [ ] `POST /api/system/wifi/test` success + failure-as-200.
- [ ] `POST /api/system/reset-wifi` (admin-gated).
- [ ] `POST /api/system/reboot` (admin-gated).

---

## 23. Multi-section behaviour (cross-cutting)

- [x] Setup: section CRUD — add a second section, rename it, delete it
  (`multi-section.journey.ts`); per-section movement selection via the
  SectionManager "Set Movement" picker (`support.ts` `setUpStartedTwoSectionGame`).
- [x] Leaderboard: Combined + per-section (Section A / Section B) tabs, each
  showing its own standings (`multi-section.journey.ts`).
- [x] Timer display: `SectionChooser` ("Choose a section") for a multi-section
  game (`multi-section.journey.ts`).
- [x] Section-scoped seats ("A1NS" vs "B1NS") do not collide: a board is
  confirmed in EACH section and both appear in standings
  (`multi-section.journey.ts`; seating via `seatPairBySeat`, enabled by a
  `data-testid="seat-{seat}"` added to `SelectTable`).
- [ ] Timer manage: `TimerSectionPicker` + "Apply to all sections".
- [ ] Sit-out messaging when one section is a pair short.

---

## 24. Teams vs Pairs

- [ ] Event Type "Teams" selectable at create.
- [ ] ContractWizard header shows "Team {id}" for a team assignment (vs "Pair
  {id}").
- [ ] `TEAM_MATCH` leaderboard rendering.
- [ ] `TEAM_OVERALL` leaderboard rendering.
- [ ] **SPEC-vs-IMPLEMENTATION GAP** — team play/seating is not distinctly
  implemented; the flow is pair-oriented and the director traveller hardcodes
  `isPair = true`. A true teams journey cannot be authored until the team play
  path exists. **No full teams UI, cannot E2E yet.**

---

## 25. Scoring types (MP / IMP / Cross-IMP)

- [ ] **GAP** — scoring type is NOT selectable in the create UI. It surfaces
  only via the traveller/leaderboard rendering plugins (`scoreBoard`,
  `getOverallPlugin`). Covering MP vs IMP vs Cross-IMP rendering would require
  **seeded games per scoring type**, since there is no UI to select it.

---

## 26. Cloud / subscription features

- [ ] **GAP (no UI, cannot E2E yet)** — Publish event results to the cloud.
- [ ] **GAP (no UI, cannot E2E yet)** — Receive software/appliance updates.
- [ ] **GAP (no UI, cannot E2E yet)** — Back up appliance data.

No front-end routes or components exist under `src/app` for these; only local
system APIs (wifi/network/reboot/restart/reset-wifi/club/admin-key) are present.
These are additive subscription features described in the product spec and are
blocked on missing UI.

---

## Gaps summary (prioritized)

Ordered by impact on confidence in the core product.

**P1 — Core player play — LARGELY CLOSED** (`played-contract.journey.ts`,
`mismatch.journey.ts`, `sit-out.journey.ts`):
- [x] Real played-contract entry through the full ContractWizard (level → suit
  → declarer → lead → made/down → confirm → submit), with opening lead both ON
  and OFF.
- [x] Both mismatch variants (different board; same board different result) and
  the re-enter path.
- [x] Sit-out round screen and sit-out submission rejection.
- [x] Game-complete screen reached by playing a table's full schedule.
- [x] Follow-ups now closed (`contract-variants.journey.ts`,
  `played-contract.journey.ts`): doubled (X) and redoubled (XX) contracts, a
  Down result (`-2`), the Not-Played (NP) outcome, `BoardSelector` paging, and
  the game-complete own-row highlight.
- Residual (low priority): enumerate the FULL made/down result ranges, and
  cover the board dropdown in the entry wizard (distinct from Board Results).

**P2 — Director corrections & shared/multi-section operation — LARGELY CLOSED**
(`director-override.journey.ts`, `share-code.journey.ts`,
`multi-section.journey.ts`):
- [x] Director override of a played contract (suited + doubled), live to the
  player.
- [x] Adjusted-score override (custom NS%/EW%), shown in the director traveller.
- [x] Share-code full co-director round-trip (generate on A, claim on B,
  manage) + invalid-code rejection. **Surfaced and fixed a production crash**
  in the claim flow (`ClaimDirectorCodeView` used `GamePageLayout` outside a
  `GameProvider`).
- [x] Multi-section: section CRUD, two-section seat→play, combined + per-section
  leaderboard tabs, and the timer section chooser.
- Remaining P2 follow-ups: adjusted-score PRESET buttons, override propagation
  to other viewers, the share-code countdown/expiry/regenerate states, and
  timer "Apply to all sections" in a multi-section game.

**P3 — Setup & timer depth — LARGELY CLOSED** (`movement-types.journey.ts`,
`table-management.journey.ts`, `timer.journey.ts`, `reconnect.journey.ts`;
section CRUD was closed in P2's `multi-section.journey.ts`):
- [x] Movement-type coverage: Mitchell and Howell selected by name, seated,
  started and played. **American Whist is not offered by the recommendation
  picker at all (product gap) — no UI path to select it.**
- [x] Section CRUD (add/rename/delete) and single-vs-multi rendering
  (`multi-section.journey.ts`, P2).
- [x] Table evict, resize, and the remove-table (shrink) guard.
- [x] Timer `saveConfig` + promote-on-start, live start/pause, next/previous
  (via "‹ Prev"), `adjustTime` (+1m), and `updateConfig` ("Apply Changes",
  applied to the next phase). **`restart:true` (previous's first step) is not
  wired to any UI and stays engine-unit-tested only.**
- [x] Reconnect re-fetch of a live context (leaderboard) after an offline drop.
- Remaining P3 follow-ups: the "apply to future phases" adjust checkbox, the
  break-screen flow in the new timer journey, invalid-break-timing alert, and
  the session-length/status-panel previews.
- **Also: replaced the stale `tests/timer.spec.ts`** (drove a removed
  Create/Start UI and was failing) with `timer.journey.ts` on the current flow.

**P4 — Device / settings happy paths — LARGELY CLOSED**
(`admin-key.journey.ts`, `wifi-settings.journey.ts`, `usebio.journey.ts`):
- [x] Admin-key gate + verify (real key unlock, wrong key, 401/400) and a full
  update-and-restore cycle.
- [x] WiFi capability-aware UI (unavailable page without `nmcli`; picker + gated
  Save with it). **Two product changes made:** WiFi routes now degrade
  gracefully (`available:false`, 200s) instead of 500s; the UI shows a clear
  "can't change WiFi here" page.
- [x] USEBIO happy-path download (complete game → club info → XML blob) +
  required-field validation. **Fixed a production bug**: the director-authed GET
  now accepts the token via `x-director-token` header (was unusable via body).
- Remaining P4 follow-ups: WiFi test-success/Save-gating on a real `nmcli` host,
  the restarting page, `GET /api/system/network`, and USEBIO "disabled until all
  results in" as a distinct assertion.

**P5 — Security / authorization:**
- Un-authed `game:submitResult` and `game:createParticipant` (any client can
  act).
- Un-gated `POST /api/system/club`.
- Positive/negative auth on director socket events and HTTP director/admin
  routes.

**P6 — Spec-only, blocked on missing UI:**
- Teams play/seating (pair-oriented implementation only).
- Scoring-type selection (MP/IMP/Cross-IMP) — no create-UI selector.
- Cloud/subscription: publish results, software updates, backups.
