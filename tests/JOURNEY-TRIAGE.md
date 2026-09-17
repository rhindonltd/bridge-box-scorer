# Journey E2E Triage

Status of the Playwright **journey** suites (`journeys-phone` / `journeys-tablet`)
after the E2E infrastructure fixes that got the functional specs green.

- Functional specs (`webkit`, `Mobile Chrome`, `Mobile Safari`): **green**.
- Journeys: **failing**. This document categorises the journey failures by root
  cause so the fix-vs-rewrite decision is evidence-based.

## How this was measured

Ran `npx playwright test --project=journeys-phone --reporter=json` against a
production server (`npm start`) and grouped failures by error signature.

- Phone project: **51 failed / ~74 total** (tablet mirrors this; the earlier
  combined phone+tablet run was 103 failed / 47 passed).
- Failures span 23 of the ~30 journey files, but they collapse into a **small
  number of shared root causes** — they are NOT 51 independent problems.

## Recommendation: FIX, don't rewrite

The failures are shallow fixture/selector drift plus two real product changes
the fixtures never caught up with. One shared seating fixture underlies the
majority. The specs still assert the right behaviours, and this exact class of
fix already surfaced a genuine app bug (see the `AssignmentContext` null-safety
crash fixed alongside the api-contract work). Rewriting would discard working
coverage and re-incur the same UI-drift questions with no passing baseline.

Rewrite only individual journeys that triage shows assert removed behaviour.

## Progress log

- **Root cause #1 FIXED** (seating fixtures now assign a distinct pair per seat
  from a 20-player `SEEDED_EBU_POOL` in `tests/fixtures/join.ts`; see
  `assignDistinctPairs`). Phone journeys went from **51 → 25** failures
  (pass 23 → 50). This confirms the single-fixture leverage predicted below.

Remaining phone failures (25), re-grouped:

- **6 — timer "Save" button** → NOT a rename. The pre-start timer config was
  refactored to **debounced autosave** (`TimerSetup.tsx` comment: "no Save
  button"), and `totalRounds`/`boardsPerRound` are now **derived from the
  selected movement**, not typed. "Apply to all sections" was also removed.
  So `timer.journey.ts` asserts a removed UI and needs genuine REWORK to the
  autosave model (edit fields → assert the debounced save persisted, e.g. via
  reload or the live promotion), not a selector swap. This is the one cluster
  where the test intent — not just its selectors — is stale.
- **6 — test timeout (90s)** → mostly downstream of other failures in the same
  file (a hung earlier step eats the budget); re-triage after the timer and
  share-code fixes.
- **4 — share-code / swiss `page.goto` "interrupted by another navigation"** →
  gotos to pages that immediately redirect or open a socket; likely need
  `waitUntil: "commit"` (same class as the play-page `waitForURL` fix).
- **3 — value assertion (toBe)** → table-management "resizing"/"cannot remove"
  and an authorization result-submit check; verify against current behaviour.
- **2 — `getByTestId('wizard-board-N')`** → the ContractWizard board picker
  renders `button "Board N"` / `button "N"`; the `wizard-board-*` testid was
  removed/renamed. Selector fix.
- **1 — create-form negative-path banner** and **1 — create-form blank-names
  waitForURL** → the inline create-form journey needs the `networkidle` wait
  (root cause #4) and its negative-path expectation re-checked against current
  client validation.
- **1 — display-detail "Failed to size section B: 404"** (`support.ts:155`) →
  a section-sizing helper hits a 404 route; endpoint moved/renamed.
- **1 — reconnect "Page crashed"** navigating to `/play/A1NS` with
  `waitUntil:"load"` → same open-socket/`load` issue; use `commit`.

## Root causes (by leverage)

### 1. Seating fixture reuses players across tables → duplicate-player rejection (BULK of failures)

`tests/fixtures/join.ts` `seatSeatsOnDevices` (and its callers
`seatTwoTableFieldOnDevices`, `seatTwoTableSectionOnDevices`,
`seatSingleSectionFieldOnDevices`, plus the single-page `seatTwoTableSection` /
`seatSingleSectionField`) assign players **by direction only**: every NS pair
gets the same two players, every EW pair the same two — regardless of table.

The app now **rejects seating a player who is already seated in the game**
("A player with EBU number NNNNNN is already seated in ..."). So the second
table's NS/EW seat is rejected, the page never navigates to `/play/`, and the
fixture's `waitForURL(/play/)` times out.

- Signature: **`waitForURL` timeout (`waiting for navigation until "commit"`)** —
  **~37 of 51** phone failures.
- Files affected (partial): contract-variants, deal-entry, director-override,
  display-detail, mismatch, movement-types, multi-section, play-flow,
  played-contract, share-code, sit-out, swiss-pairs, traveller-live, usebio,
  leaderboard-live, reconnect, request-on-mount, realtime-internals,
  completed-game-redirect.
- Fix: give every seat a **distinct** player. `SEEDED_EBU` was extended to 8
  players during the api-contract fix (10008/10009/10021/10056 alongside the
  original four); apply the same distinct-per-seat assignment in
  `seatSeatsOnDevices` and the other multi-table seating helpers. A field of N
  tables needs 4N distinct players, so this likely needs a larger seeded pool
  (pull more EBU numbers from `data/players.db`, all resolvable via
  `/api/players/search?q=<ebu>`). Also delete the stale
  "no distinct-player constraint" comments.
- Confidence: **high** — reproduced manually end-to-end (seat table 1 NS then
  table 2 NS with the same players → "already seated" banner, no navigation).
- Note: this is a **fixture** bug, not an app bug. The app rule is correct.

### 2. Timer pre-start config refactored to autosave (timer cluster) — REWORK, not reselect

`tests/journeys/timer.journey.ts` waits for/clicks a "Save" button and an
"Apply to all sections" button on the pre-start timer config, and types into
`#total-rounds`.

CONFIRMED against the current code (`src/app/game/[gameId]/manage/timer/
TimerSetup.tsx`, `TimerConfigFields.tsx`): the pre-start config now **autosaves**
(debounced; explicit comment "no Save button"), `totalRounds`/`boardsPerRound`
are **derived from the selected movement** (not typed), and **"Apply to all
sections" was removed**. The live (post-start) controls the journey uses —
Pause/Start, Next/Previous phase, +1m, Apply Changes, the apply-to-future
checkbox — appear to still exist.

- Signature: **element not visible** (`Save`) — **6 of 7** timer failures.
- Fix: REWORK the pre-start portion of the journey to the autosave model — edit
  the fields, wait for the debounce, and assert persistence via reload or via
  the promote-on-start behaviour it already tests; drop the "Save" and "Apply to
  all sections" steps; stop typing derived round counts. Keep the live-control
  assertions. This changes test INTENT, so it should be done deliberately (and
  is the natural place to confirm the new autosave UX is what the team wants
  tested).
- Confidence: **high on the diagnosis**; the rework itself is the biggest single
  remaining task.

### 3. Cascading assertion failures from unseated fields

`tests/journeys/table-management.journey.ts` fails `expect(...).toBe(2)` /
received `0`, and some 90s test timeouts (authorization, multi-section) occur —
these depend on a seated field that never materialised because of root cause #1.

- Signature: **value assertion (toBe)** (3) and **test timeout 90000ms** (4).
- Fix: expected to clear once #1 is fixed. Re-triage the remainder afterwards;
  any residue is likely its own small selector drift.
- Confidence: **medium** — partly gated on #1; recount after #1 lands.

### 4. create-form journey (1-2)

`create-form.journey.ts` asserts the "Failed to create game" banner is visible
(negative-path test) and has its own `waitForURL(/create/)`. The WebKit
create-form race (BridgeWebs on-mount fetch dropping the first field) was fixed
in the shared `game-create` fixture but this journey drives the form inline.

- Fix: apply the same `waitForLoadState("networkidle")` before filling, and
  re-check the negative-path expectation against current validation behaviour.
- Confidence: **medium**.

## Suggested order of work

1. Fix root cause #1 in `tests/fixtures/join.ts` (distinct players + larger
   seeded pool). Re-run journeys — expect the failure count to drop sharply.
2. Fix the timer `Save` selector (#2) once #1 unblocks the timer journeys.
3. Re-triage the remainder (#3, #4) against a fresh JSON run; fix or, only where
   a journey asserts removed behaviour, delete/replace that specific spec.

## Reproduce / re-measure

```bash
npm start &                       # production server on :3000 (needs a build)
npx playwright test --project=journeys-phone --reporter=json > /tmp/journey-phone.json
# then group by error signature (see git history of this triage for the script)
```

Prerequisites already handled this session: `next build` passes; the admin-key
label file exists (`data/admin-key.txt`, via `src/scripts/reset-admin-key.ts` +
`npm run seed-admin-key`); `playwright.config.ts` loads `.env` so `DATABASE_URL`
resolves for the runner.
