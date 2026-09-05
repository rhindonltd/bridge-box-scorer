# E2E Test Coverage Audit

Purpose: a comprehensive inventory of Bridge Box Scorer functionality that end-to-end
tests should cover, so we can see exactly where the holes are. Scope is everything under
`tests/` — both Playwright browser/journey flows and Playwright request-context (API /
socket-level) tests.

## Legend

- `[x]` — covered by an existing test
- `[ ]` — gap, no test today
- `(PARTIAL)` — some coverage exists but the flow is only shallowly exercised; the note
  says what is and isn't tested

## How coverage was assessed

Read every spec, journey, and fixture under `tests/` and mapped them against the full app
surface: routes under `src/app`, HTTP `route.ts` handlers under `src/app/api`, and the
Socket.IO events/handlers under `src/socket`. Current specs: `smoke`, `api`, `game-api`,
`club-settings`, `settings`, `settings-menu`, `results-live`, `timer`. Journeys:
`leaderboard-live`, `traveller-live`, `request-on-mount`. Fixtures provide: create game,
set table count, pick first movement, seat a two-table field (EBU search), start game,
enter/confirm a Pass Out, director override to 1NT, delete game, unlock settings.

---

## 1. App entry & navigation

- [x] Main menu renders with Join Game link (`smoke.spec.ts`)
- [x] `/join` loads (`smoke.spec.ts`)
- [x] `/settings` loads (`smoke.spec.ts`)
- [x] `/create` reachable (`smoke.spec.ts`)
- [ ] Main menu shows all entries: Create New Game, Manage Games, Room Display, Settings cog
- [ ] Each main-menu link navigates to the correct route
- [ ] `/display` game selector loads and lists joinable games
- [ ] `/manage` game selector loads (uses all games, not just joinable)
- [ ] SelectGame empty state ("No games have been created yet.")
- [ ] SelectGame loading spinner
- [ ] SelectGame rows show event name, formatted date, table count
- [ ] `not-found` (unknown game id → notFound)
- [ ] `error` boundary renders on a thrown error
- [ ] `/manage` select of a game you are NOT director for → inline ClaimDirectorCode path

## 2. Game creation (`/create`)

- [ ] Create form renders: Event Name, Director Name, Event Type (Pairs/Teams), Date Played, Record Opening Lead toggle
- [ ] Date Played defaults to today
- [ ] Record Opening Lead toggle defaults to Yes
- [ ] Create success navigates to `/game/{id}/create`
- [ ] Create failure shows inline error and re-enables the button
- [ ] No-validation edge: blank event/director names are accepted (documents current behaviour)
- [ ] Event Type = Teams path (currently create is exercised only implicitly via fixtures, always Pairs)

Note: fixtures create a Pairs game as setup, but there is no assertion-level test of the
create form itself.

## 3. Director setup — Tables

- [ ] NumberStepper resize a section (emits UPDATE_TABLES, grid re-renders)
- [ ] Evict a pair (confirm dialog → EVICT_PARTICIPANT), and failure alert path
- [ ] Remove-table rule: only allowed when tables > 1 and last table unoccupied
- [ ] Start-check problems list shown (amber) when not startable
- [ ] One-pair-short → "…will sit out each round" message
- [ ] Start Game disabled until valid movement + full seating; enabled when both hold
- [ ] Participants live-sync across contexts (PARTICIPANTS event)
- [x] (PARTIAL) Start Game happy path — `startGame` fixture drives it in journeys, but only for a fully-seated two-table Howell; the gating/problems states are untested

## 4. Director setup — Sections

- [ ] Add section
- [ ] Rename section (label commit; reset when cleared/unchanged)
- [ ] Delete section (hidden when only one section; allowed when >1)
- [ ] Single-section vs multi-section rendering (headings/label editor only when multi)
- [ ] Per-section movement summary text
- [ ] "Add Section" banner shown in single-section movement picker

## 5. Director setup — Movement

- [x] (PARTIAL) Pick first recommended movement — `pickFirstMovement` fixture selects the first card (Howell for two tables); no assertion on which movement or its detail
- [ ] Mitchell (generated) movement selection persists
- [ ] Howell (seeded spec) selection persists
- [ ] American Whist (seeded spec) selection persists
- [ ] Recommendations grouped by boards-a-pair-plays
- [ ] Empty state ("No recommended movements are available for this table count yet.")
- [x] `GET /api/movements/pairs/{1,2,4}` returns arrays + item shape (`api.spec.ts`)
- [x] `GET /api/movements/detail/PAIRS/{id}` returns detail (`api.spec.ts`)
- [x] `GET /api/movements/detail/INVALID_TYPE/1` → 400 (`api.spec.ts`)
- [ ] `GET /api/movements/pairs/0` or non-numeric → 400 "Invalid table count"
- [ ] `GET /api/movements/detail/PAIRS/{missing}` → 404 "Movement not found"

## 6. Player join & seating

- [x] (PARTIAL) Seat a two-table field via EBU search — `seatTwoTableField`/`seatPair` fixtures do this end to end (table+direction pick, per-seat EBU search, Enter Pair, navigate to play); used as journey setup, no dedicated assertions
- [ ] SelectTable shows sections/tables with occupied seats updating live
- [ ] EnterPlayerNames sheet labels (North/South for NS, East/West for EW)
- [ ] PlayerSearch states: "Searching…", result list, selected green card + clear (X)
- [ ] Enter Pair disabled until both players chosen
- [ ] Seating from a player's own context (not just director context)
- [x] `GET /api/players/search` EBU digit match, no-match empty, <2 chars empty (`api.spec.ts`)
- [ ] Player search with a non-numeric name query returns [] (documents digits-only behaviour)

## 7. Player play — ContractWizard

- [x] (PARTIAL) Pass Out (PO) end to end — `enterPassOut` fixture (Enter Round → board → Pass Out → Submit)
- [ ] Real played contract: level (1–7) → suit (C/D/H/S/NT) → declarer → confirm → submit
- [ ] Special outcome "Not Played" (NP) short-circuits to confirm
- [ ] Doubling None / X / XX on the declarer step
- [ ] Made result (=, +1 … up to 13−(6+level))
- [ ] Down result (−1 … up to 6+level)
- [ ] Opening lead step present when leadCardRequired (suit + rank), and skipped when not
- [ ] Back-navigation skips the lead step when leadCardRequired is false
- [ ] BoardDropDown switches board after step 0
- [ ] Confirm step renders full contract string ("4♥ X by North") + lead + result

## 8. Player play — flow states

- [x] (PARTIAL) boardResults reached after confirm — asserted in `traveller-live` journey ("Board Results")
- [ ] roundInfo (RoundInfoPage: round/table/boards/players, Enter Round)
- [ ] sit-out round → SitOutPage + Continue
- [ ] waiting (WaitingForConfirmation) — asserted in `traveller-live` only as an intermediate step
- [ ] mismatch screen (both variants) — see §10
- [ ] re-enter from mismatch back into contract entry
- [ ] BoardResults BoardSelector pages through already-played boards
- [ ] moveInfo (MoveInfoPage) between rounds
- [ ] gameComplete (final leaderboard, own row highlighted; fallback thank-you)

## 9. Dual-side confirmation & disputes

- [x] Match → confirm → BOARD_CONFIRMED flips waiting side to Board Results (`confirmBoardPassOut` fixture / journeys)
- [ ] Board-number mismatch variant (title "Mismatch", different-boards copy)
- [ ] Result mismatch variant (same board, different result; title "Board N")
- [ ] Mismatch shows NS entered vs EW entered
- [ ] Re-enter after mismatch
- [ ] Sit-out submission rejected ("This board is a sit-out")
- [ ] Partial submission (one side only) leaves board pending / waiting

## 10. Director result correction / overrides

- [x] Open board traveller before play shows "—" (`traveller-live`, `request-on-mount`)
- [x] Override a Pass Out row to 1NT and player traveller updates live (`traveller-live`)
- [x] Late-opened director traveller shows existing Pass Out via request-on-mount (`request-on-mount`)
- [ ] Override entered as a full played contract (not just PO→1NT)
- [ ] Adjusted score presets (AVE 50/50, 60/40, 40/60, 60/60, 40/40)
- [ ] Adjusted score custom NS%/EW% inputs
- [ ] Traveller empty state ("No results for this board yet.")
- [ ] Override error path (banner + return to select-board)

## 11. Real-time correctness

- [x] Leaderboard request-on-mount resolves past spinner (`results-live`)
- [x] Late-opened leaderboard + traveller show existing results (`request-on-mount`)
- [x] Occupancy-gated live push reaches already-mounted leaderboard (`leaderboard-live`)
- [x] Timer request-on-mount: display opened after timer created still syncs (`timer.spec.ts`)
- [ ] Reconnect re-fetch (socket disconnect → CONNECT → state re-requested)
- [ ] socket→SWR sync (useSocketSWRSync updates cache without revalidation)
- [ ] Occupancy gating is compute-only: a client that joins right after a change still gets current state (request-on-mount covers the correctness backstop; the "no recompute when unwatched" optimisation is untested)

## 12. Timer — config

- [x] (PARTIAL) timer:create via director — `timer.spec.ts` configures rounds + play/move durations and creates
- [x] Scheduled break shows break screen on display (`timer.spec.ts`)
- [ ] timer:saveConfig (configured-but-not-started state) during setup
- [ ] Invalid break-timing alert ("Break timing is invalid" + per-break overrun)
- [ ] Session-length preview
- [ ] Multi-section "Apply to all sections"

## 13. Timer — live controls

- [x] Start, Pause/Resume (`timer.spec.ts`)
- [x] Next phase, Previous phase (`timer.spec.ts`)
- [ ] Previous-restart (restart:true restarts current phase)
- [ ] adjustTime (±, and apply-to-future-same-type)
- [ ] updateConfig / Apply Changes on a live timer
- [ ] promote-on-start: a configured (saveConfig) timer starts when the game starts

## 14. Timer — display

- [x] Round label, PAUSED, countdown MM:SS, break screen (`timer.spec.ts`)
- [ ] "Connecting…" state before first snapshot
- [ ] Multi-section SectionChooser + "← Sections" back
- [ ] Single-section skips the chooser
- [ ] serverNow clock-offset correction

## 15. Leaderboard display

- [x] Empty state (leaderboard-empty / no rows) then fills on confirm (`leaderboard-live`)
- [x] Standings rows appear (leaderboard-standings / leaderboard-row) (`leaderboard-live`, `request-on-mount`)
- [ ] Combined vs per-section tabs (multi-section)
- [ ] Default to Combined; single-section hides tabs
- [ ] Team leaderboards (TEAM_MATCH / TEAM_OVERALL) render distinctly from pairs

## 16. Traveller display

- [x] Row updates live on confirm and on override (`traveller-live`)
- [ ] Traveller empty state before any result
- [ ] Board switching re-keys provider (joins new board's room)

## 17. Share director access

- [ ] Generate code on mount (6-char) with 5-min countdown (mm:ss)
- [ ] Expiry → "Code expired." + regenerate
- [ ] "Generate New Code" button
- [ ] Generate error line
- [ ] Claim: uppercase 6-char input, disabled until length ≥ 6
- [ ] Claim valid → `/game/{id}/manage`
- [ ] Claim invalid / already-used / expired errors
- [ ] Full co-director round-trip: generate on device A, claim on device B, B can manage

## 18. Delete game

- [x] (PARTIAL) Delete via manage menu — `deleteGame` fixture (Delete Game → Yes, Delete Game) used as journey cleanup; no assertion on outcome
- [ ] Confirm screen names the event
- [ ] Local director token cleared + navigate away on success
- [ ] Failure inline error ("Failed to delete game" / "Network error")
- [ ] DELETE `/api/games/{id}/delete` director-authed (token in JSON body); 401 without / with bad token

## 19. USEBIO export

- [x] `GET /api/games/nonexistent/usebio` → 404 + content-type (`api.spec.ts`)
- [ ] Download flow: confirm club Name + EBU number, required-field validation, POST club then GET usebio, blob download (filename from Content-Disposition)
- [ ] "Download USEBIO" disabled until all results are in
- [ ] `GET /api/games/{id}/usebio` 400 when club not configured
- [ ] usebio director-auth: token supplied in body on the GET; unauthorized without it
- [ ] Successful XML export content-type `application/xml`

## 20. Settings & device

- [x] Settings menu heading + WiFi/Club links visible and navigate (`settings-menu.spec.ts`)
- [x] WiFi page UI presence: heading, network selector, password field, Test Connection, Save & Apply disabled initially, Test disabled without network, dropdown placeholder (`settings.spec.ts`)
- [x] Club page UI: heading, Club Name, EBU Club Number, Save, Back (`club-settings.spec.ts`)
- [x] `GET /api/system/club` shape; `POST /api/system/club` save + missing-field 400 + persistence (`club-settings.spec.ts`)
- [x] `POST /api/system/restart` responds (`api.spec.ts`)
- [ ] Admin-key gate (AdminKeyEntry) blocks settings until unlocked (tests currently seed the token via `unlockSettings`, bypassing the gate UI)
- [ ] `POST /api/system/admin-key/verify` success mints token; wrong key → 401 "Incorrect admin key"
- [ ] Update admin key `POST /api/system/admin-key` (<4 chars → 400)
- [ ] `POST /api/system/wifi/scan` returns ssids
- [ ] `POST /api/system/wifi/test` success + failure-as-200 (`{success:false}` with 200)
- [ ] Save & Apply enabled only after a successful test of the SAME SSID
- [ ] Restarting page after save
- [ ] `POST /api/system/wifi` admin-gated save
- [ ] `GET /api/system/network` connected/currentSSID/savedSSID
- [ ] reset-wifi / reboot admin routes

## 21. Auth & authorization

- [ ] Director socket events reject a missing/invalid token ("Unauthorized"): evict, selectMovement, start, updateTables, section CRUD, generateShareCode, overrideResult
- [ ] HTTP director routes 401 without a valid token in body: usebio, delete
- [ ] Admin routes 401 without `x-admin-token`: wifi, wifi/test, admin-key, reset-wifi, restart, reboot
- [ ] SECURITY GAP: `game:submitResult` has no director auth — any connected client can submit a result
- [ ] SECURITY GAP: `game:createParticipant` has no director auth — any client can add a participant
- [ ] SECURITY GAP: `POST /api/system/club` is not admin-gated despite being a device setting

## 22. HTTP API contract tests (by route)

Games:
- [x] `GET /api/games/joinable` (`api.spec.ts`)
- [x] `GET /api/games/[id]` 404 (`api.spec.ts`, `smoke.spec.ts`)
- [ ] `GET /api/games/all`
- [ ] `GET /api/games/[id]` for an existing game (200 + shape)
- [ ] `GET /api/games/[id]/participants`
- [ ] `GET /api/games/[id]/movement?section=`
- [ ] `GET /api/games/[id]/sections`
- [x] `GET /api/games/nonexistent/boards` 404; `/boards/1` 404 (`game-api.spec.ts`)
- [ ] `GET /api/games/[id]/boards` and `/boards/[n]` for an existing game
- [ ] `GET /api/games/[id]/boards/[bad]` → 400 "Invalid board number"
- [x] `GET /api/games/nonexistent/movement` 404; `/schedule/1NS` 404 (`game-api.spec.ts`)
- [ ] `GET /api/games/[id]/schedule/[seat]` for an existing seat; 404 "Schedule not found"
- [ ] `GET /api/games/[id]/results-summary`
- [ ] `GET /api/games/[id]/start-check`
- [x] `GET /api/games/nonexistent/usebio` 404 (`api.spec.ts`)
- [ ] `DELETE /api/games/[id]/delete`

Movements:
- [x] `GET /api/movements/pairs/[tables]` + item shape (`api.spec.ts`)
- [x] `GET /api/movements/detail/[type]/[id]` + invalid type 400 (`api.spec.ts`)

Players:
- [x] `GET /api/players/search` digit match / empty / short (`api.spec.ts`)

System:
- [x] club GET/POST + validation (`club-settings.spec.ts`)
- [x] restart responds (`api.spec.ts`)
- [ ] admin-key/verify, admin-key, network, wifi/scan, wifi, wifi/test, reset-wifi, reboot

Error/status contracts to assert broadly: 404 "Game not found", 400 validation
messages, 401 Unauthorized, and the wifi-test 200-with-`success:false` case.

## 23. Multi-section behaviour (cross-cutting)

- [ ] Setup: per-section table counts + per-section movement
- [ ] Leaderboard Combined + per-section tabs
- [ ] Timer display SectionChooser + manage TimerSectionPicker + apply-to-all
- [ ] Sit-out when a section is a pair short

All gaps — every journey uses a single section.

## 24. Teams vs Pairs

- [ ] Create a Teams game and seat/play through the team flow
- [ ] ContractWizard header shows "Team {id}" for a team game
- [ ] Team leaderboards (TEAM_MATCH / TEAM_OVERALL) render
- SPEC-vs-IMPLEMENTATION GAP: team play/seating is not distinctly implemented (the play
  flow is pair-oriented; director traveller hardcodes isPair=true). Cannot fully E2E team
  play until the UI exists.

## 25. Scoring types (MP / IMP / Cross-IMP)

- [ ] MP scoring surfaces correctly on traveller + leaderboard
- [ ] IMP scoring surfaces correctly
- [ ] Cross-IMP scoring surfaces correctly
- GAP: scoring type is not selectable in the create UI; it only surfaces via rendering
  plugins. E2E would need games seeded per scoring type rather than a UI path.

## 26. Cloud / subscription features

- [ ] Publish event results to the cloud
- [ ] Receive software updates
- [ ] Back up appliance data
- GAP: no front-end routes/components exist for these; only local system APIs are present.
  No UI, cannot E2E yet.

## 27. Gaps summary (prioritized)

P1 — Core player play (highest risk, thinnest coverage):
- Real played-contract entry through the ContractWizard (only Pass Out is exercised)
- Both mismatch variants + re-enter
- Sit-out submission rejection and sit-out round screen
- gameComplete / final leaderboard

P2 — Director & real-time depth:
- Director override as a full played contract + adjusted scores (presets + custom)
- Share-code full co-director round-trip (generate + claim)
- Multi-section behaviour across setup, leaderboard, timer

P3 — Setup & timer breadth:
- Movement types (Mitchell / Howell / American Whist) individually
- Section CRUD, evict, table resize + remove-table rule, start-check problems
- Timer saveConfig / adjustTime / updateConfig / previous-restart / promote-on-start
- Reconnect handling

P4 — Device / settings:
- Admin-key gate + verify (wrong key) rather than seeding the token
- WiFi scan/test + Save gated on successful same-SSID test
- USEBIO happy-path download + disabled-until-all-results-in

P5 — Security / authorization:
- Un-authed `game:submitResult` and `game:createParticipant`
- Un-gated `POST /api/system/club`
- Director/admin 401 paths across events and routes

P6 — Spec-only (blocked on missing UI):
- Teams play/seating
- Scoring-type selection (MP/IMP/Cross-IMP)
- Cloud/subscription: publish, updates, backup