# Withdrawals & late arrivals — design

Status: **proposed.** Covers EBU White Book §2.3–§2.4, i.e. audit items **F24**
(withdrawals), **F25** (late arrivals), **F26** ("without standing" ranking
exclusion) and **F27** (director-eviction post-start guard). Source of truth for
the rules: `docs/reference/ebu-white-book-scoring.md` §6; the findings these
address: `docs/reference/ebu-white-book-audit.md` F24–F27.

This document is a plan, not committed code. It scopes the feature to what the
appliance actually needs, reuses the indemnity helpers that already exist, and
sequences the work so each step is independently shippable and testable.

---

## 1. What this is

Today a seated pair/team is a bare identity row (`participants`: seat +
two players + secret key — no state). The only way to remove one is
`deleteParticipant`, a **hard delete** that also deletes the player rows and
leaves the pair's board rows (and their `matchId` FK) orphaned. There is no
concept of a contestant who stopped partway, arrived late, or "plays but doesn't
count". The White Book has precise scoring consequences for all three; none are
implemented.

The feature adds:

1. A **withdrawal** lifecycle: a director marks a contestant withdrawn at a
   point in the event; the scoring consequence depends on whether it happened
   **before or after half** the event/session.
2. A **"without standing"** state: a contestant whose results **count for their
   opponents but not for themselves**, and who does **not appear in the final
   ranking** (§2.4.9).
3. **Late-arrival** handling: a session can start a pair short with the missing
   boards credited AVE+/AVE−, with a defined fallback if the pair never arrives.
4. A **guard** so a director cannot silently hard-delete a seated pair mid-game
   (F27).

---

## 2. Scope: what we build vs. what we deliberately omit

The appliance runs Pairs, Teams, Swiss Pairs and Swiss Teams on a club LAN for a
single session. A great deal of §2.3–§2.4 is **tournament procedure**, not a
scoring calculation, and does not apply here. Keeping scope tight is the main
design decision.

### In scope (scoring consequences we must get right)

- **§2.4.9 "without standing"** — opponents' results stand; the contestant is
  dropped from the ranking. (F26)
- **§2.4.4 withdrawal part-way through a session** — the before-half / after-half
  split (cancel vs stand + indemnity). This is the realistic club case. (F24)
- **§2.4.3 withdrawal at end of a session** — scores stand; a pair forced to sit
  out as a result is treated as a pre-scheduled sit-out. (F24)
- **§2.4.5 score given _to_ the withdrawer** — AVE− (+ optional fine) on boards
  after withdrawal, or removal from the ranking for a genuine illness. (F24)
- **§2.4.6 score for the withdrawer's unplayed boards** — Swiss → the §3.3.9
  void-match formula; otherwise AVE−. (F24)
- **§2.4.7 late arrival: half-table at the start** — missing boards AVE+/AVE−;
  **if the pair never arrives, cancel those and treat the forced sit-out as a
  pre-scheduled sit-out.** (F25)
- **§2.4.7 retaining standing** — a latecomer keeps standing if present for half
  the boards; otherwise their unplayed boards score per §2.4.6. (F25)
- **F27 guard** — block (or redirect) director eviction after the game starts.

### Out of scope (procedure, or configurations the appliance doesn't run)

- **§2.3.3 stand-by 45/90-minute rights, and the stand-by → real-pair
  _handover_.** Two separate things are out of scope here:
  - the wall-clock timers governing _who may claim a seat_ (not a scoring
    calculation; the director decides who sits); and
  - the mid-session **swap-in**: a stand-by plays some boards "without
    standing", then the real pair arrives and reclaims the seat for the rest
    (§2.4.7). This needs a model the appliance does not yet have — see §9. What
    we DO model is the simpler whole-session case: a seat marked
    `WITHOUT_STANDING` for the entire session (a sub who plays the pair's whole
    session but does not count). We do NOT model a sub who hands the seat back
    partway.
- **§2.4.2 all-play-all withdrawal.** "All-play-all" is a formal
  Conditions-of-Contest construct (advertised as such), out of scope per the
  audit's scope note. A small Swiss/Mitchell field where everyone _could_ meet
  is NOT all-play-all. We implement the not-all-play-all rules (§2.4.3/§2.4.4),
  which is what the appliance's events are.
- **§2.4.8 start-delay timing / procedural penalties** — wall-clock TD
  procedure. The director already controls when to start.
- **§2.4.10 knockout bye/walkover, §2.4.11 master points, §2.5 correction
  periods** — explicitly out of scope (no knockouts; MP/CP are an EBU/TO matter).
- The §2.4.5 **per-board fine (0–40%)** as an automated figure — this is TD
  discretion. We let the director _enter_ a fine percentage; we do not compute
  one.

### Irreducible director judgements (we assist, never decide)

Mirroring how F19/F20/F21 were done, these stay with the director and the UI
only _records_ them:
- Whether a withdrawal reason is "acceptable" (illness) → ranking-removal vs
  AVE−-plus-fine (§2.4.5).
- The fine percentage 0–40% (§2.4.5).
- Which contestant is "without standing" (§2.4.9) — a substitute/stand-by is a
  director call.
- The before/after-half classification is **computed** (from boards played) but
  the director can override, because "half the session" can be fuzzy with
  fouled/averaged boards.

---

## 3. The core concepts, mapped to code

### 3.1 Contestant lifecycle state (new)

`participants` gains a lifecycle fact. A pair/team is one of:

| State | Meaning | Appears in ranking? | Opponents' results vs them |
|---|---|---|---|
| `ACTIVE` (default) | normal | yes | count normally |
| `WITHDRAWN` | stopped at a recorded point | per §2.4.5 (usually no) | per before/after-half (§2.4.4) |
| `WITHOUT_STANDING` | plays, doesn't count for itself (§2.4.9) | **no** | count in full |

Proposed shape (new nullable columns on `participants`, so an ACTIVE pair is
unchanged and existing rows migrate as all-ACTIVE):

```ts
// participants
standing: text("standing", {
  enum: ["ACTIVE", "WITHDRAWN", "WITHOUT_STANDING"],
}).notNull().default("ACTIVE"),
// The round at which the contestant withdrew (the round it was PART-WAY through,
// or had just finished). Null when ACTIVE. Only coarse context for the UI and
// the Swiss "not drawn into later rounds" fact — it is NOT how played/unplayed
// is decided (see below).
withdrawnInRound: integer("withdrawn_in_round"),
// §2.4.5 score given TO the withdrawer: director's choice.
//   REMOVE  — drop from ranking entirely (genuine illness)
//   PENALISED — AVE− + a 0..40% fine on boards after withdrawal
withdrawalTreatment: text("withdrawal_treatment", {
  enum: ["REMOVE", "PENALISED"],
}),
// The 0..40 fine percentage when PENALISED (null otherwise).
withdrawalFinePercent: integer("withdrawal_fine_percent"),
```

**"Played vs unplayed" is read from the board rows, not from a stored board
threshold.** Board NUMBERS are not monotonic with play order: a pair can play
boards 20–24 in round 1, then wrap to boards 1–4 in round 2, so "highest board
number played" is not "last board played" and no `boardNumber ≤ threshold` test
is valid. Instead, a board is **played** by a contestant exactly when that
contestant's board row (its specific `(section, round, table, boardNumber)`
cell) carries a real confirmed/overridden result; it is **unplayed** when the
row exists in the schedule but has no result (status `NOT_PLAYED`, or simply
unentered) at or after the withdrawal point.

So the authoritative fact is "which of this contestant's scheduled board rows
have a result" — a _set_ of cells, read straight from `boards`, which the
materialiser already lays down for the whole movement up front. `withdrawnInRound`
is kept only as coarse metadata (what the director saw / UI display and the
Swiss "don't draw them into later rounds" note); the scoring never thresholds on
it. This is robust to a mid-round withdrawal (a pair ill after board 2 of a
4-board round has results on 2 of that round's cells and none on the other 2)
and to wrap-around board numbering, because it asks the row "do you have a
result?" rather than comparing board numbers.

Teams: a team's standing keys on its home-NS seat id (the same id `findTeams`
produces), so the same columns on the home participant row carry it. (A team is
two pairs at a home table; the home participant row is the natural anchor.)

Why columns on `participants`, not only a `matches.ruling` token: a withdrawal
is a **per-contestant** fact ("pair A3 withdrew"), not a per-encounter one. The
scorers still need per-encounter effects, but those are _derived_ at scoring
time (§3.3) from the contestant's `standing` plus which of its board rows have
results — not stored redundantly per match.

### 3.2 The "half the event/session" threshold

§2.4.4 pivots on whether the withdrawal is before or after **half** the
session's boards. The played count is just **how many of the contestant's board
rows have a real result** (§3.1) — a direct count over `boards`, with no
board-number arithmetic, so it is correct under wrap-around numbering and a
mid-round stop. The denominator (total scheduled boards) comes from the data
already threaded: `expectedBoards` (per-round board count) × scheduled rounds,
or equivalently the count of board rows the contestant is scheduled on.

```
playedBoards(contestant) = count of its board rows WITH a result
playedBoards ≥ ceil(totalScheduledBoards / 2)  →  AFTER half
                                          else  →  BEFORE half
```

Computed in `leaderboard-service.ts` where `expectedBoards`/round counts already
live. Because it counts actual results, a pair ill after board 2 of a 4-board
round 4 (in a 7×4 = 28-board session) counts 14 boards played → the `≥ ceil(28/2)`
test resolves the exact-half boundary; nothing is rounded up to "round 4
complete", and it does not matter which board NUMBERS those 14 were. No director
override in v1 (decision §6.4).

### 3.3 Scoring consequences, by case

All of these REUSE existing helpers — this feature is mostly _wiring state into
scorers_, not new scoring maths.

**(a) Opponents of a withdrawer, BEFORE half (§2.4.4) — cancel.** The scores
_against_ the withdrawn contestant are removed from the overall. This is exactly
the "void match" shape already built:
- Teams: emit/read a match-level ruling so the match contributes a ruling VP, or
  is dropped from the opponent's played-match set. Reuse `teams-match-void.ts`.
- Pairs board-pooled: the withdrawn pair's board rows that have a result against
  an opponent are removed from the scored field (per board, keyed on the row's
  own cell — not a round range). A board where the opponent still has a
  comparable field keeps counting (short-board equalisation, §7); a board that
  _only_ existed vs the withdrawer is cancelled. "Which rows" is read from the
  board rows (§3.1), so a mid-round withdrawal cancels only the specific cells
  played against the withdrawer, not a whole round.

**(b) Opponents of a withdrawer, AFTER half (§2.4.4/§2.4.3) — stand + indemnity.**
Real results stand. A contestant forced to sit out as a result receives **AVE+**
(§2.4.4 after-half) or the **pre-scheduled sit-out treatment** (§2.4.3
end-of-session). Both already exist:
- AVE+ credit → `swissSitOutScoredBoards` / `compensationMpFractions` (0.6) and
  the XIMP/VP analogues.
- "Treat as pre-scheduled sit-out" → the SIT_OUT synthesis path verbatim.

**(c) Score given TO the withdrawer (§2.4.5).**
- `REMOVE` → the F26 "without standing" exclusion (drop from ranking); their
  boards still count for opponents under (a)/(b).
- `PENALISED` → AVE− (`compensationMpFractions`'s 0.4 / the `AVE_MINUS` fault
  side of `voidMpFractions`) on boards after withdrawal, up to half the event,
  minus the director's fine. A per-board score between 0% and AVE−.

**(d) The withdrawer's unplayed boards (§2.4.6).**
- Swiss → the §3.3.9 void-match formula (`voidMatchVp` / `voidSplitVp`), already
  built for F19/F20.
- Otherwise → AVE− per unplayed board (the 0.4 fraction).

**(e) Late arrival, half-table at start (§2.4.7).** Missing boards are credited
AVE+/AVE− (the half-match / void split helpers). **Fallback: if the missing pair
never arrives**, cancel those AVE+/AVE− credits and re-treat the forced sit-out
as a pre-scheduled sit-out (the SIT_OUT path). This is a late-binding decision —
the director marks "never arrived", which flips the scoring.

### 3.4 Ranking exclusion (F26) — the one genuinely new scoring stage

`buildOverallScore` and every teams/Swiss `rank(...)` call currently rank **every
id present**. A `WITHOUT_STANDING` (or `REMOVE`-withdrawn) contestant must be
dropped from the ranked output **after** aggregation (so their results still
counted for opponents) but **not** from the input (removing their board rows
would delete the opponents' comparisons).

Design: a single `excludeFromRanking: Set<string>` (participant ids) threaded
into each scorer, applied as a post-aggregation filter at each `rank` seam:
- pairs board-pooled: in/after `buildOverallScore` (drop excluded ids before
  `rank`);
- Swiss Pairs VP, Teams VP, Teams IMP-agg, BAM/PAB: each drops excluded ids
  before its own `rank`.

The same set must be applied in the **USEBIO export's own `computeOverallRanking`**
(the export does not reuse the leaderboard ranking) — so the published file and
the live leaderboard agree.

---

## 4. Why the matches-table refactor helps here

A withdrawal's _per-encounter_ effects (cancel this match / indemnify this
opponent) are naturally expressed as the match-level rulings the scorers already
read (`matches.ruling`, `team-match.ts` / `swiss-vp-round.ts`). The contestant
lifecycle fact lives on `participants`; a scoring pass turns "A3 withdrew after
round 3" into the per-match rulings and per-board credits the existing void /
sit-out / mismatch machinery consumes. Without the matches table this would have
required smearing tokens across board rows (the pre-refactor pattern) — so this
is a direct payoff of that work, as the matches-table design predicted.

---

## 5. Proposed build order (each step shippable + green)

1. **F27 guard (tiny, independent).** Add the `isGameStarted` guard to the
   director eviction route, matching `leave-table.handler.ts`. Before withdrawal
   exists, eviction after start should be blocked rather than silently
   orphaning rows. Later, eviction-after-start becomes "open the withdrawal
   flow". _No scoring change; a safety fix._
2. **Lifecycle state + migration.** Add the `participants` columns (§3.1) and a
   games-DB migration; default everything `ACTIVE` so nothing changes yet.
   A `withdrawParticipant` action (NOT `deleteParticipant`) that sets state and
   never deletes rows.
3. **F26 ranking exclusion.** Thread `excludeFromRanking` through every scorer +
   the USEBIO ranking. Drive it from `standing` = `WITHOUT_STANDING` or a
   `REMOVE` withdrawal. _Testable in isolation with a seeded without-standing
   pair._
   - **DONE (live leaderboard + VP/teams USEBIO).** `readRankingExclusions`
     (`src/db/games/queries/ranking-exclusions.ts`) builds the id set;
     `applyRankingExclusion` (`src/scoring/overall/exclude-ranking.ts`) drops
     excluded lines and re-ranks the survivors, applied at the four
     leaderboard-service entry points; the four VP/teams USEBIO assemblers skip
     excluded ids in `buildRanking`. `computeSectionLeaderboardsAsOf`
     deliberately does NOT exclude (it reconstructs a past draw's standings).
   - **DONE (MP-pairs USEBIO placing).** `UsebioPairsData.excludedFromRanking`
     carries the section-qualified seats; `generateUsebioXml` reduces them to
     section-local pair numbers per section and threads them into
     `appendSectionContent` → `computeOverallRanking`, which drops an excluded
     pair from the placings AFTER its results have accumulated into opponents'
     totals (so opponents' percentages stand). The excluded pair stays a
     PARTICIPANT with no PERCENTAGE/PLACE.
4. **Withdrawal scoring — the withdrawer's own score (§2.4.5/§2.4.6).** AVE−
   (+ fine) or Swiss §3.3.9 for unplayed boards, reusing the void helpers.
   - **DONE (board-pooled pairs, PENALISED).** `withdrawerSelfCreditBoards` in
     `leaderboard-service.ts` synthesises a per-board credit on each of a
     PENALISED withdrawer's unplayed (no-result) board rows: MP → `(40 −
     fine)/100` of the board top on the withdrawer's seat (AVE− at 0% fine, 0 at
     40%); IMP/XIMP → the field-average (0) credit so the board still counts.
     Capped at half the event's scheduled boards (§2.4.5). Driven by
     `readPenalisedWithdrawers`; a REMOVE withdrawer is NOT self-credited (it is
     dropped from the ranking by step 3). `computeSectionLeaderboardsAsOf` passes
     no withdrawers (draw-replay fidelity).
   - **DONE (teams-VP withdrawer).** The teams-VP withdrawer score is
     match-level: `applyTeamWithdrawalRulings`
     (`src/scoring/swiss/team-withdrawal.ts`) synthesises a `VOID:SHORT_OFFENDER_*`
     ruling (home-relative: NS when the withdrawer is the match home, EW when the
     opponent) on every UNPLAYED (`boardsPlayed === 0`) TEAMS match row the
     withdrawn team was drawn into, which the existing teams-VP scorer honours via
     `matchVoidCause` → `voidMatchVp` (withdrawer AVE−, opponent AVE+). Covered
     with the opponents in step 5. Swiss unplayed boards don't exist as rows (the
     pair isn't drawn into later rounds), so there is nothing to self-credit for a
     Swiss-Pairs withdrawer there.
5. **Withdrawal scoring — opponents (§2.4.3/§2.4.4).** Before-half cancel /
   after-half stand + indemnity, computing the half threshold from
   `expectedBoards` × rounds.
   - **DONE (board-pooled pairs).** The step-4 self-credit pass was unified into
     `withdrawalCreditBoards` (`leaderboard-service.ts`): on each of a
     withdrawer's unplayed board rows it credits BOTH sides — the withdrawer's
     own §2.4.5 AVE−-minus-fine (PENALISED only) AND the opponent's §2.4.4
     indemnity: AVE+ (60% of the board top) when the withdrawal is AFTER half,
     nothing (cancel → the opponent just plays fewer boards, handled by §4.2.3
     equalisation) when BEFORE half. The before/after-half split is per
     withdrawer, counted from the boards it actually played (§3.2). The opponent
     indemnity applies to BOTH REMOVE and PENALISED withdrawers (`readWithdrawals`
     returns all WITHDRAWN pairs), since an opponent's lost boards are
     indemnified regardless of how the withdrawer itself is scored. IMP/XIMP
     credit both sides the field-average (0) so the board still counts.
   - **DONE (teams-VP).** A whole-team withdrawal makes every match it was drawn
     into but did NOT play a §3.3.9 void (withdrawer AVE−, opponent AVE+),
     indemnifying the opponent at the match level. `applyTeamWithdrawalRulings`
     augments the match rows in-memory at scoring time (NOT persisted — a
     withdrawal is a derived scoring consequence) with a `VOID:SHORT_OFFENDER_*`
     ruling on unplayed TEAMS rows involving a withdrawn team, never clobbering a
     real director ruling. Wired into BOTH the live leaderboard
     (`leaderboard-service.ts`, combined + per-section teams-VP branches) and the
     USEBIO teams export (`usebio-service.ts` → `assembleSwissTeams`), where a new
     void branch in `buildUsebioMatches` (`teamsVpSplit`) emits the same
     `voidMatchVp` split so the published file matches the board. The §3.3.9 split
     is sized by the movement's boards-per-round, read via the new
     `boardsPerRoundOf` helper (`selected-movement.ts`) — it falls back to the
     flat §3.3.6.1 40% when unknown. For Round-Robin Teams the future matches
     exist as unplayed rows with a `matchId`; for Swiss Teams they are never
     drawn, so only the rounds actually drawn-but-unplayed are voided. The
     per-pair board-pooled withdrawal (above) is a separate, complete pass. (Odd
     fields: a withdrawal that voids a TRIPLE comparison is out of scope — the
     augmentation only tags ordinary TEAMS rows.)
6. **Late arrival (§2.4.7).** Half-table-at-start AVE+/AVE− with the
   never-arrived fallback to the pre-scheduled sit-out treatment. This is the
   largest piece and depends on relaxing the "at most one sit-out" start rule
   (`start-validator.ts`), so it comes last.
7. **Director UI + docs.** A "Withdraw / mark absent" flow on the manage screen;
   update `docs/director-guide.md`. Each scoring step above ships with its own
   unit/int tests first; the UI lands once the scoring is trustworthy.
8. **(Deferred to the end) Stand-by → real-pair handover (§2.4.7 swap-in).** The
   mid-session case where a sub plays some boards "without standing" and the
   real pair reclaims the seat for the rest. This needs a model the appliance
   does not yet have (a per-seat, per-board-range substitute identity) — see
   §9. Intentionally last, and only if real demand appears; the director can
   approximate it until then.

---

## 6. Resolved decisions

1. **Teams withdrawal is whole-team only.** A single-pair replacement within a
   team is a "without standing" substitute, not a team-level withdrawal.
2. **Before-half cancel for board-pooled pairs** reuses the existing §4.2.3
   short-board equalisation — see the worked example in §7. Confirmed to match
   §2.4.4.
3. **All-play-all is out of scope.** No §6.2 "own average over the event"
   indemnity; no realised-session-average helper is built.
4. **The before/after-half split is computed from boards played** (§3.2). No
   director override in v1.

---

## 7. Worked example — before-half withdrawal, Mitchell pairs (§2.4.4)

The subtle case is cancelling "scores against the withdrawer" in a pairs field
(for teams it is simply a cancelled match). The claim: it needs **no new scoring
code** — the withdrawer's played board rows are removed from the scored field,
and the existing §4.2.3 short-board equalisation (`equaliseMpBoards`) does the
rest.

**Setup.** A 6-table two-winner Mitchell, 10 N-S pairs vs 10 E-W... keep it
small: say a field where **board 5** is normally played **E = 5 times** (5 N-S/E-W
tables compare on it). Pair **X** (an E-W pair) withdraws **before half**, having
played board 5 once — against N-S pair **P** — before leaving.

**Board 5, as played (5 comparisons, top = 2·(5−1) = 8 on the doubled scale):**

| Line | N-S score | raw MP (vs other 4) |
|---|---|---|
| P vs **X** | +620 | 8 (top) |
| Q | +170 | 6 |
| R | +170 | 6 (tie with Q → 5+... see note) |
| S | −100 | 2 |
| T | −100 | 2 |

**Before half → cancel the score against X.** P's result on board 5 came only
from facing the withdrawn pair X, so that comparison is cancelled: P's board-5
line is removed. Board 5 now has **A = 4** real lines (Q, R, S, T) where the
field expects **E = 5**.

- The remaining 4 pairs are matchpointed over their own realised field (top
  2·(4−1) = 6), then **`equaliseMpBoards` scales them up to the full-field top
  2·(5−1) = 8 via Neuberg** `((M+1)/A)·E − 1` — exactly as it already does for a
  half-table or fouled board. No pair that genuinely played a 5-comparison board
  is penalised relative to this short board, because every board is lifted to the
  common top before the `Σvalue / Σmax` ranking.
- **P** (the opponent who can no longer be compared on board 5) simply has no
  board-5 line. P is now a pair that played **fewer boards**, which §4.2.5 /
  F11/F28 already handles: P is ranked on its average over the boards it DID
  play (`Σvalue / Σmax`), so losing one comparison neither helps nor hurts it
  beyond removing that board from its average. (If instead P should be
  _indemnified_ because the loss was not its doing, that is the **after-half**
  rule — before half, §2.4.4 says cancel, full stop.)
- **X** (the withdrawer) contributes nothing to the ranking and is dropped from
  it (§2.4.9 / §2.4.5 `REMOVE`).

**Why this is just the existing path.** "Cancel scores against X" = "X's played
board rows are absent from the scored field". Absent lines shrink each affected
board's realised field by one, which is the precise input `equaliseMpBoards` was
built for. So the before-half pairs case is implemented by **filtering the
withdrawer's played board rows out of the scored field** (each identified by its
own cell, so a mid-round withdrawal drops only the cells actually played against
X) and letting the existing equalisation run — not by any new matchpoint maths.

> Note on the raw-MP column above: exact tie handling (Q/R both +170) is the
> ordinary matchpoint tie split and is unchanged by this feature; it is elided
> here to keep the example about the cancellation, not the tie.

**After-half contrast (same board).** If X had withdrawn _after_ half, P's
board-5 result would **stand** (not be cancelled), and any pair forced to sit out
as a knock-on receives AVE+ (`swissSitOutScoredBoards` / the 0.6 credit) — the
other existing path. So the two halves of §2.4.4 map onto two code paths we
already have: before = short-board equalisation; after = sit-out/AVE+ credit.

---

## 8. Non-goals / explicitly unchanged

- `deleteParticipant` stays for the **pre-start** case (a pair leaves before the
  game starts — the existing `leave-table` path). Withdrawal is a **post-start**
  concept and uses the new state, never the hard delete.
- The Swiss draw is unchanged: a withdrawn contestant simply isn't drawn into
  later rounds (the director draws the next round from who remains). Modelling a
  withdrawal does not require changing `drawSwissRound`/`drawSwissTeamsRound`.
- No wall-clock timers, no automated fines, no master-point/NGS handling.

---

## 9. Deferred — stand-by → real-pair handover (§2.4.7 swap-in)

**The scenario.** A pair is missing at the start (or mid-session). A stand-by /
substitute sits in and plays some boards "without standing" (§2.4.9 — their
results count for opponents, not for themselves). The real pair then arrives in
time to play half the boards, reclaims the seat, and keeps its standing for the
rest; the stand-by's boards are handled per §2.4.7.

**Why the current model can't represent it.** `standing` is a single enum on
**one `participants` row keyed by `initialSeat`**, and board rows are keyed by
**seat** (`ns` / `ew` = e.g. `A1NS`), not by _who_ sat there. So a seat holds
exactly one pair identity and one standing. The model can say "the pair at seat
A1NS does not count" (whole-session without-standing) and "the pair at A1NS
withdrew", but it has **no way to say** "boards 1–6 at A1NS were played by a
_different_, without-standing pair, and boards 7–24 by the real pair who then
counts". The seat's results are an undifferentiated whole, and there is no
second identity for the sub nor a board-range link crediting each pair its own
boards. The §3 model deliberately conflates "this seat's pair doesn't count"
with "a sub is temporarily here" — fine for the whole-session case, wrong for a
handover.

**What a real implementation would need** (any one of):

1. A **per-seat substitute identity over a board range** — e.g. a
   `seat_occupancy` sidecar (`seat`, `playerPair`, `boardStart`, `boardEnd`,
   `standing`) so a seat can be held by different pairs over disjoint board
   ranges, each with its own standing, and the scorers credit each pair only its
   own boards. This is the faithful model but a real schema + scoring change.
2. A **director-driven approximation** (no new identity): the director marks the
   seat `WITHOUT_STANDING` while the sub plays, then flips it back to `ACTIVE`
   on arrival — accepting that the handful of boards the sub played are credited
   to the real pair as if they had played them. Physically the cards sit at the
   table, so this is close to what happens anyway; it is wrong only in that the
   sub's boards count for the real pair's own score (the §2.4.7 nuance of
   scoring those boards AVE+/AVE− to the real pair is not applied).

**Decision: defer to the end** (build-order step 8), and only if real demand
appears. A mid-session stand-by handover is a rare club occurrence, option 1 is
disproportionate to that frequency, and option 2 is a director workaround that
needs no code. The whole-session without-standing case (step 3) and the
withdrawal cases (steps 4–5) cover the common ground; this item is the remaining
§2.4.7 refinement.
