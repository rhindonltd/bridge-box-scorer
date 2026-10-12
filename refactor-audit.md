# Refactor Audit — bridge-box-scorer

Where functionality has been bolted on over time and a clean refactor would improve readability and maintainability. Findings are grounded in files read directly plus two targeted surveys of the socket/service and context/component layers.

Overall the codebase is deliberately factored and unusually well-commented. The smells cluster around one recurring theme: **features were added by copy-pasting a sibling rather than extracting a shared seam** — most visibly as "pairs vs teams" twin modules, and as per-ruling handler clones. The client side already shows the target state (`useFeatureSnapshot`); the server side and a few components never got the same treatment.

A quick note on the biggest file: `leaderboard-service.ts` (1375 lines) looks alarming by size but is mostly dense EBU-rule logic with excellent inline rationale. Its only real smell is a 15-argument parameter tunnel (Finding 7) — not a rewrite candidate. Leave its scoring internals alone.

---

## Priority 1 — Safe, high-leverage wins (pure plumbing)

### 1. Five director board-ruling handlers are the same handler five times
`src/socket/handlers/results/` — `traveller-override`, `cancel-board`, `remove-teams-board`, `void-pairs-match`, `void-teams-match`.

Each handler is byte-for-byte identical except for (a) its zod payload's one ruling field, (b) the single DB action it calls, and (c) two log/error strings. Confirmed by reading `traveller-override.handler.ts` and `remove-teams-board.handler.ts` side by side — the whole body is the same skeleton:

```ts
if (!assertDirector(directorToken, gameId, ack)) return;
const db = await getDb(gameId);
if (!db) throw new HandlerError("Game not found");
try { await <action>(db, { roundNumber, tableNumber, boardNumber }, <built>); }
catch (err) { log.error(...); throw new HandlerError("Failed to ..."); }
ack({ success: true, data: null });
await broadcastResultsChanged(io, gameId, boardNumber);
```

The docblocks even admit it ("Mirrors the cancel-board handler", "Mirrors the teams void handler").

**Why it hurts:** any cross-cutting change (audit logging of rulings, concurrency checks, altering the broadcast) means editing five files in lockstep. The copy-pasted "assertDirector acks its own Unauthorized failure" comment appears five times.

**Refactor:** one `registerDirectorBoardRuling(socket, io, { event, schema, apply })` factory that owns auth → getDb → try/apply → ack → `broadcastResultsChanged`. Each call site becomes ~15 lines: its event, a `boardRulingBase` zod object merged with its one extra field, and an `apply(db, location, payload)` callback. Collapses five ~70-line files into five short declarations plus one factory.

### 2. Three `*:requestState` / `*:leave` handlers repeat the room join/leave skeleton
`src/socket/handlers/results/` — `leaderboard-request`, `traveller-request`, `round-results-request`.

Confirmed in `traveller-request.handler.ts` and `leaderboard-request.handler.ts`: both `socket.join(Rooms.X(...))`, then `try { snapshot = db ? build(...) : null; ack({success,data}) } catch { log; ack({success:true,data:null}) }`, then a separate `socket.on(LEAVE_X, …safeParse… socket.leave(...))`. The "a compute failure is an empty snapshot, not an error" idiom is copy-pasted into all three.

**Why it hurts:** the join-on-request / leave-on-leave coupling is the correctness-sensitive core of the live-results design, reimplemented three times with slightly different leave-schema handling. A fourth live feature will copy it again.

**Refactor:** `registerRoomBackedRequest(socket, io, { requestEvent, leaveEvent, schema, roomKey, buildSnapshot })`. Notably, this is the **server-side mirror of `src/hooks/use-feature-snapshot.ts`**, which already encapsulates exactly this lifecycle on the client. Naming them symmetrically makes the request/sync/leave contract legible from both ends.

### 3. `GameContext` is the one context that never adopted the shared socket hooks
`src/context/GameContext.tsx` (~lines 46–66).

It hand-rolls a `useEffect` that emits `JOIN_GAME`, registers `CONNECT` (re-join on reconnect) and `GAME_UPDATED` (`mutate(payload.game, false)`), and tears down with `LEAVE_GAME`. Meanwhile `AssignmentContext` and `usePlayFlow` already consume `useSocketRevalidate`, and the three DB-derived contexts all delegate to `useFeatureSnapshot`. GameContext is the odd one out — a reader sees three different styles for conceptually the same job.

**Refactor:** move the `GAME_UPDATED → mutate` half to `useSocketSWRSync`, leaving a small purpose-named `useGameRoom(gameId)` for the join/leave/reconnect-join membership (which is genuinely GameContext-specific). Then all five live contexts read as "one shared hook per concern."

---

## Priority 2 — Structural "pairs vs teams twin" consolidation

These deliver the most long-term maintainability but need a small shared seam introduced first, so treat them as a follow-on to Priority 1.

### 4. The two Swiss draw services are near-duplicate twins
`src/services/draw-swiss-round-service.ts` ↔ `draw-swiss-teams-round-service.ts`.

Each is the same service written twice: a `Draw*Rejection` union, an `isRoundComplete` (almost byte-identical — same `boards innerJoin matches` query and `every(status ∈ {…} || ruling != null)` check), a `rankedStandings` + `Ranked*` interface + `build*Standings` trio, a `resolve*DrawContext` running the identical precondition sequence, and `previewNext*`/`commitNext*` with the same control flow.

**The copies have already drifted** — exactly the risk copy-paste invites:
- The pairs `isRoundComplete` filters out `SIT_OUT`/`HALF_AVERAGE` playable rows; the teams version treats `SIT_OUT` as complete. A subtle, silent divergence in the "complete" status set.
- Teams carries triple/long-triple/`resolveOddRound`/`fixedTriple` logic pairs lacks; pairs carries `seatedPairIdsForSection` phantom handling teams lacks.

**Refactor:** extract a shared `isRoundComplete` (parameterised by the complete-status set and the ignore-these-non-playable set) and a `StandingsStrategy` (`decodeLine`, `resolveName`, `appendUnranked`) so `rankedStandings`/`build*Standings` become one function. A `resolveDrawContextBase` + format strategy unifies the preconditions. The pure engine calls (`drawSwissRound` vs `drawSwissTeamsRound`) and structural validators stay as the only injected format-specific pieces.

### 5. The two Swiss draw socket handlers are also twins
`src/socket/handlers/swiss/draw-next-round.handler.ts` ↔ `draw-next-teams-round.handler.ts`.

Confirmed: both end their commit handler with the identical four-step post-commit fan-out (comments and all):

```ts
const game = await findGameById(gameId);
io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { game });
await broadcastLeaderboardChanged(io, gameId);
await resumeTimerAfterDraw(io, gameId, section as SectionLetter);
ack({ success: true, data: { roundNumber: result.roundNumber } });
```

Both define overlapping `REJECTION_MESSAGE` maps and the same `validateDirectorToken → previewNext* → reject-or-ack` preview shape.

**Refactor:** extract `broadcastAfterDrawCommit(io, gameId, section)` as the single owner of that four-step sequence, and share a base `REJECTION_MESSAGE` map each format extends. A `registerSwissDrawHandlers(..., { previewEvent, commitEvent, preview, commit, messages })` unifies both files.

### 6. `detect-swiss-mismatch-service.ts` carries parallel detection + duplicated decode helpers
`src/services/detect-swiss-mismatch-service.ts`.

`detectPairsSectionMismatches` and `detectTeamsSectionMismatches` run the same algorithm (loop rounds 2..highest, skip ruled rounds, read committed round, `computeSectionLeaderboardsAsOf`, build corrected input, detect, map to candidate). Alongside them sit four near-identical decode twins: `standingsOrder`/`teamStandingsOrder` and `currentVpByPair`/`currentVpByTeam`, differing only in `swissPairIdFromParticipant(...)` vs `parseSeat(...).tableNumber`.

That "decode `overallScore.lines` into stable ids / VP totals" concept is reimplemented here **and again** inside both draw services (Finding 4's `rankedStandings`) — the same idea lives in ~6 places.

**Refactor:** one `LeaderboardDecoder` abstraction (`order(board) → id[]`, `vpById(board) → Map`) with a pairs and a teams impl, reused by both the detect service and the draw services. Factor the shared "replay each committed round and diff" loop into a driver taking a per-format `detectRound` strategy; the teams triple (F21 Part B) detection becomes a clearly separated add-on rather than an inline branch.

### Also in this family (lower severity)
- **`materializeSwissRound` ↔ `materializeSwissTeamsRound`** share the same getDb → idempotency-guard → `buildSectionRows` → `insertSectionDrafts` wrapper; only the inner `*ToMaterializable` differs. The per-round idempotency guard is a correctness feature duplicated in two places. Extract `appendRoundIfAbsent(..., buildMovement)`.
- **`SWISS_SIT_OUT_PHANTOM` / `TEAMS_BYE_PHANTOM`** are both the literal `"PHANTOM"`, defined separately in the two materialize files and hardcoded a third time inline in `start-game-service.ts` (`applySwissRoundOneSitOut`). One shared constant.

---

## Priority 3 — Component / UI duplication

### 7. `CorrectResultPage` — six near-identical `save*` emitters + a 100-line dispatch ladder
`src/app/game/[gameId]/manage/travellers/CorrectResultPage.tsx` (~lines 128–415).

Each director ruling added over time got its own async saver — `saveOverride`, `saveCancel`, `saveRemoveTeams`, `saveVoidMatch`, `saveVoidPairs`, `saveMismatch` — all identical except the `SocketEvents.*` constant, the extra payload fields, and the error string. Each repeats the same `setWizardStep("saving")` → `setError(null)` → `try { emitWithAck(...); onResultCorrected() } catch { setError(...); setWizardStep("selectBoard") }` scaffold. On top sits `handleWizardComplete`, a ~100-line `if (data.type === …) return;` ladder routing the `DirectorWizardResult` union to the matching saver.

**Why it hurts:** adding the next ruling means touching three places in lockstep (the union, a new `saveX`, a new `if` arm) and copy-pasting the save scaffold a seventh time — exactly where someone forgets `setError(null)`.

**Refactor:** one `submitRuling(event, extraPayload)` owning the saving/try/catch scaffold once, driven by a table keyed on `DirectorWizardResult["type"]` → `{ event, buildPayload(data) }`. The if-ladder becomes a lookup + spread of `{ roundNumber, tableNumber, boardNumber }`; the contract / `"PO"` / `"NP"` / `parseContract` tail is the one entry with a custom `buildPayload`.

### 8. `DirectorContractWizard` duplicates the player wizard's contract state machine
`src/app/game/[gameId]/manage/travellers/DirectorContractWizard.tsx` ↔ `src/hooks/board-flow.ts`.

The director wizard was grown by copying `useBoardFlow` and bolting adjustment branches on top. They share, essentially verbatim: the same contract/lead/result `useState` block, the same transition handlers (`onLevelSelected`, `onSpecialOutcome`, `onSuitSelected`, `onDeclarerSelected`, `onLeadComplete`, `onResultComplete`), and the same contract-portion `handleBack` ladder — including the identical quirks `case 5: setStep(leadCardRequired ? 4 : 3)` and `case 6: setStep(specialOutcome ? 1 : 5)` in both files.

The director version additionally uses **magic step numbers 0–13** with a hand-maintained comment legend and three parallel positional switches (`handleBack`, `stepTitle`, `renderStep`) that must stay consistent. Inserting a step means renumbering across three switches and the legend; a mismatch is silent.

**Refactor:** extract the shared contract-entry sub-flow into a `useContractEntry` hook both wizards consume, so each only owns what differs (player: board auto-select; director: the adjustment-type hub + branches). Replace the numeric `step` with a named discriminated union and derive title/back/render from one `Record<step.kind, …>` config instead of three positional switches.

---

## Priority 4 — Minor / consistency

- **`leaderboard-service.ts` parameter tunnel.** `computeCombined` / `computeSections` each take ~15 positional parameters, and `buildLeaderboards` / `computeLeaderboard` / `computeSectionLeaderboards` each destructure the same 15-field bag from `readLeaderboardInputs` only to re-thread it as positional args. Bundle the config into one `LeaderboardInputs` object passed through, instead of 15 positional params. Low risk, high readability gain; does not touch the scoring logic.
- **`swr-keys.ts` style drift + fetch policy.** Most builders are one-line arrows but `game` uses an explicit block+`return`; query builders `encodeURIComponent` while path builders never encode `gameId`/`seat` (latent bug if an id ever carries a URL-special char). Separately, the "`playState` 404 means 'no assignment yet', don't retry" rule is re-encoded as an inline `shouldRetryOnError: e => e.status !== 404` in both `AssignmentContext` and `play-flow.ts` rather than defined once with the endpoint. Consider a tiny `usePlayStateSWR(gameId, seat)` that owns the 404 policy.
- **`start-game-service.ts` per-source `if` chain** in `resolveSectionStart` (`SWISS_TEAMS` / `ROUND_ROBIN_TEAMS` / `SWISS`), each delegating to a differently-shaped `resolveXStart`, plus a separate `applySitOut` switch on source. Would read better as a `Record<source, SectionStartResolver>` strategy map — but the per-source logic genuinely differs, so this is cosmetic.
- **`play-flow.ts` dispatcher wrappers.** Seven near-identical `handleX = useCallback(() => dispatch({ type: "X" }), [dispatch])` could be one `makeDispatcher(type)`. Trivial.

---

## Suggested sequence

1. **Findings 1 & 2** first — pure server-side plumbing, lowest risk, biggest line reduction, and they make the request/sync/leave contract symmetric with the already-good client `useFeatureSnapshot`.
2. **Finding 3** — small, aligns the last stray context.
3. **Finding 7** — self-contained component cleanup; the `isRoundComplete` status-set drift in Finding 4 is a latent-bug flag worth noting even before refactoring.
4. **Findings 4, 5, 6** together, after introducing the `StandingsStrategy` / `LeaderboardDecoder` seam once — these are the deepest wins but want a shared abstraction in place first.
5. **Finding 8** — the `useContractEntry` extraction; do it alongside or after 7 since both touch the director wizard flow.

Findings 1, 2, 3, and 7 are the safest first PRs. Each has strong existing test coverage (`*.test.ts` / `*.int.test.ts` co-located) to verify against.
