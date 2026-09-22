# Codebase Readability & Simplification Audit — Plan

Behavior-preserving refactor across all of `src/`, sequenced by area
(scoring → server → client), safest-first within each phase.

**Verification (run per phase):** `npm test` (or `npx vitest --project unit` for
fast loops), `npm run lint`; run `npm run build` at each phase boundary to catch
route/type regressions. Journey tests need a live server, so note in the change
summary what was verified via tests vs. not exercisable without a running server.

**Ordering note:** Complete and verify each task before the next. Some Phase C
tasks depend on earlier ones (15 builds on 14; 18 builds on 17).

---

## Phase A — Scoring & pure logic (`src/scoring`, `src/movement`, `src/timer`)

- [x] **Task 1: Collapse the duplicated `scoreOf` closures in `team-match.ts`.**
  Replace the two inner `scoreOf` closures (`teamMatchBoardImps`,
  `teamMatchBoardWins`) with calls to the existing top-level `scoreOfRow`. Keep
  `scoreOfRow` as the single implementation; remove the near-name collision.
  Tests: existing `team-match` unit tests pass unchanged.

- [x] **Task 2: Extract `unionBoardNumbers` and `compareByRoundSectionTable` helpers.**
  Add `unionBoardNumbers(...maps)` (covers 2-map and triangle N-map cases) and a
  `compareByRoundSectionTable` comparator; use them in `groupTeamMatches`,
  `groupTeamTriangles`, `teamMatchBoardImps`, `teamMatchBoardWins`,
  `triangleBoardNumbers`, and the literal in `lib/usebio/assemble-swiss-pairs.ts`.
  Tests: scoring + usebio tests pass.

- [x] **Task 3: Share the VP `Accumulator`/`credit` between the VP scorers.**
  Extract the identical `Accumulator { totalVP; vpByRound }` and `credit` (with
  its `Math.round(...*100)/100`) into a shared helper used by
  `swiss-vp-overall.ts` and `teams-vp-overall.ts`; replace the open-coded copy in
  `swiss-mp-vp-overall.ts`. Keep the MP scorer's extra `boards` set local.
  Tests: all three scorers' unit tests pass.

- [x] **Task 4: Consolidate the teams view-builder helpers.**
  Move `teamPlayerLines`/`teamNameCell` to a shared `team-names.ts` (sibling of
  `pair-names.ts`) and extract the round-count reduce + `Array.from({length})`
  into one helper used by `swiss-vp-view.ts`, `swiss-teams-vp-view.ts`,
  `teams-board-comparison-view.ts`. Optionally unify
  `buildSwissVpTable`/`buildSwissTeamsVpTable` only if it reads cleaner.
  Tests: view/table unit tests + stories pass.

- [x] **Task 5: Clarify scoring naming and the plugin-registry placeholders.**
  In `registry.ts`, make the BAM/PAB display-only intent obvious (named constant
  / clearer entry naming) rather than relying on prose; keep the registry (real
  dispatcher for MP/IMP/XIMP). In `movement/shared.ts`, inline the
  `boardSetToBoardList` alias (or rename at source), rename `parseMovementType`
  to reflect it's a lookup/cast not a parser, and add a one-line comment to
  `formatBoards` explaining the intentional out-of-bounds read.
  Tests: registry + movement tests pass.

- [x] **Task 6: Decompose `BridgeTimerEngine.updateConfig` and `previousPhase`.**
  Split `updateConfig` into "apply config fields" and "re-anchor in-flight
  phase" so the load-bearing duration-write ordering is explicit and the
  double-write is removed; collapse `previousPhase`'s four repeated
  `if (shouldContinue) this.start()` tails and repeated phase-reset blocks into a
  single post-switch resume tail. Riskiest scoring change — lean on the timer
  engine tests; no timing-behavior changes. Tests: full timer-engine suite passes.

---

## Phase B — Server (`src/db`, `src/socket`, `src/app/api`, `src/lib/api`)

- [x] **Task 7: Introduce `requireGameDb` and apply it across `src/db/games`.**
  Add `requireGameDb(gameId): Promise<Db>` that resolves `getDb` and throws
  `new Error("Game db does not exist")` (message preserved verbatim), then
  replace the ~20 duplicated guards in `src/db/games/actions/*` and `queries/*`.
  Tests: `npm test` incl. `games-coverage.int.test.ts`.

- [x] **Task 8: Standardize the db function signature convention.**
  Pick the handle-in convention (`fn(db, ...)`) and update callers to resolve
  `db` once via `requireGameDb`; fix the movement route's double `getDb`
  resolution. Do incrementally, only for functions with a mismatched sibling;
  leave socket-facing `gameId`-in functions with no db-in caller.
  Tests: affected db + route tests pass.

- [x] **Task 9: Thread `section` through `withGameRoute` and delete `sectionFromUrl`.**
  Add `section` to `RouteParams`/`GameRouteContext` in `gameRoute.ts` (mirroring
  `seat`), update the 4 `[section]` routes to consume it from context, and remove
  `section-param.ts` + its test + the 4 redundant null-checks.
  Tests: the 4 route tests pass; `npm run build` succeeds.

- [x] **Task 10: Add a `bodySchema` option to the HTTP route wrappers.**
  Extend `withGameRoute`/`withDirectorRoute` to accept an optional Zod
  `bodySchema` that parses the body and returns a uniform 400 "Invalid request"
  (mirroring `registerHandler`), then remove the ~9 copy-pasted safeParse→400
  blocks. Pass the parsed body into the handler context; keep the 400 shape
  identical. Tests: affected route tests pass.

- [x] **Task 11: Decompose `submit-result.handler.ts`.**
  Move the inline sit-out drizzle query into a named `getBoardStatus` query under
  `db/games/queries`; extract the mismatch/confirmed emit blocks into small named
  emit helpers. No behavior change to the dual-side confirmation logic (lives in
  `reconcileSubmissions`). Tests: submit-result handler + relevant int/journey
  coverage pass.

- [x] **Task 12: Route `draw-next-round` (and `draw-next-teams-round`) through the shared broadcaster.**
  Replace the hand-rolled occupancy-gated leaderboard push with
  `broadcastResultsChanged` (or a small `broadcastLeaderboardChanged(io, gameId)`
  sharing the existing `roomSize` helper), removing the inline room-size math and
  the awkward `payloadLb` name. Fix both draw handlers.
  Tests: swiss draw handler tests pass.

- [x] **Task 13: Align the results-handler error mechanism and share the code-validation preamble.**
  Standardize on `throw new HandlerError(...)` for "Game not found" in
  `traveller-override`/`deal-override` (remove the manual `ack+return`); extract
  the shared "look up code by uppercased value → check used → check expiry →
  mark used" preamble used by `validate-share-code.ts` and
  `validate-seat-transfer-code.ts`. Keep seat-transfer's secret-rotation on top.
  Tests: results handler + share/seat-transfer tests pass.

---

## Phase C — Client (`src/lib`, `src/components`, `src/context`, `src/hooks`)

- [x] **Task 14: Extract a keyed token-store factory and a shared `verifyToken` helper.**
  Factor the gameId-keyed localStorage store shared by
  `director-token.ts`/`player-token.ts` (set/get/clear) and the device-global
  `admin-token.ts`; unify `verifyDirectorTokenWithServer`/
  `verifyAdminTokenWithServer` into one `verifyToken({ url, headerName, token,
  onInvalid })` (clear-on-401, `res.ok`, catch→false). Keep the "presence ≠
  authorization" doc in the one shared place.
  Tests: `director-token.test.ts`, `admin-token.test.ts` pass.

- [x] **Task 15: Extract the auth-guard state machine.** (builds on Task 14)
  Factor the `checking|authorized|unauthorized` + `latestCheck` race-guard shared
  by `DirectorGuard.tsx` and `settings/layout.tsx` into one hook/component
  parameterized by the verify fn and the unauthorized action (redirect vs.
  prompt). Tests: `DirectorGuard.test.tsx`, `settings/layout.test.tsx` pass.

- [x] **Task 16: Extract a `useAutoRepeat` hook for the steppers.**
  Pull the shared press-and-hold timer core (300→400ms delay, accelerating
  interval, paired timeout/interval refs, `stopAdjusting`) out of
  `NumberStepper.tsx` and `StepperInput.tsx` into `useAutoRepeat`; keep the two
  components' distinct DOM/events. Align the min-speed floor and export style
  (named); remove `StepperInput`'s provably-dead non-finite branch and its
  `v8 ignore`. Don't merge the components, only the timer logic.
  Tests: both steppers' unit tests/stories pass.

- [x] **Task 17: Extract a `PluginViewSwitcher` and shared error/fetch helpers.**
  Factor the view-toggle scaffolding shared by
  `PerBoardTravellerView.tsx`/`OverallLeaderboardView.tsx` into one component
  (views + toggle + single-view fallback), parameterized by the `toTable` call.
  Add an `errorMessage(err, fallback)` helper (and optionally a `useSavingAction`
  wrapper) for the repeated `alert(err instanceof Error ...)` +
  `setSaving`/try/finally idiom. Add an `unwrap(key)` SWR fetcher factory for the
  `response.game`/`response.games` boilerplate; consolidate the local
  `formatDate`. Tests: affected component tests/stories pass.

- [x] **Task 18: Simplify `SectionMovementPicker.tsx` and align client naming.** (builds on Task 17)
  Extract the ~70 lines of near-duplicated Swiss/Swiss-Teams option JSX into one
  `SwissOptionCard` (labels/testid/handler as props); group the three save
  handlers via the Task 17 helper; consider grouping the three dialog
  controllers. Rename the two generic `ContextType` interfaces to
  `GameContextValue`/`PlayContextValue`. Optionally route
  `GameContext`/`SelectGamePage`'s hand-rolled reconnect/update wiring through the
  existing `useSocketRevalidate`/`useSocketSWRSync` hooks (GameContext stays the
  room-join owner). Tests: setup-flow component tests + relevant journey tests pass.
