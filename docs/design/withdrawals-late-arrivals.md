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

> **Note (post-refactor).** This document was written against the original
> `participants` + `assignment` tables, which have since been replaced by the
> first-class **`seat_occupancy`** entity (see
> [`seat-occupancy-handover.md`](./seat-occupancy-handover.md)). The withdrawal /
> late-arrival **lifecycle columns** described below (`standing`,
> `withdrawnInRound`, `withdrawalTreatment`, `withdrawalFinePercent`) now live on
> `seat_occupancy` rather than `participants`, and the behaviour is otherwise
> exactly as described. Read "`participants` row" throughout as "the seat's
> occupancy". §9 is updated in place.

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
| `LATE` | arrived after the start (§2.4.7) | yes if present ≥ half the boards; else per §2.4.5 | count in full |

Proposed shape (new nullable columns on `participants`, so an ACTIVE pair is
unchanged and existing rows migrate as all-ACTIVE):

```ts
// participants
standing: text("standing", {
  enum: ["ACTIVE", "WITHDRAWN", "WITHOUT_STANDING", "LATE"],
}).notNull().default("ACTIVE"),
// The round at which the contestant withdrew (the round it was PART-WAY through,
// or had just finished) — or, for a LATE arrival, the round it arrived. Null
// when ACTIVE. Only coarse context for the UI and the Swiss "not drawn into
// later rounds" fact — it is NOT how played/unplayed is decided (see below).
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
6. **Late arrival (§2.4.7).** Three cases, only the first of which has
   distinctive scoring the appliance didn't already have:
   - **(a) Retaining standing — DONE.** A latecomer keeps standing if present
     for at least HALF the event's boards; otherwise its UNPLAYED (early) boards
     score per §2.4.6 — the same AVE−/void treatment as a withdrawal. Modelled
     as a new `LATE` participant standing (no migration — `standing` is a plain
     `text` column, so widening the enum is a type-level change only) that
     reuses the `withdrawalTreatment`/`withdrawalFinePercent` columns. The one
     new rule — the half-boards retain-standing test — lives in
     `resolveStandings` (`src/db/games/queries/ranking-exclusions.ts`): it reads
     each contestant's standing + the board rows and, for a `LATE` arrival,
     counts boards actually played against `⌈total / 2⌉`. A latecomer that
     reached half is scored normally (not excluded, not credited); one that fell
     short is folded into the SAME `withdrawals` set the §2.4.4–§2.4.6 passes
     already consume (`withdrawalCreditBoards` for board-pooled pairs,
     `applyTeamWithdrawalRulings` for teams-VP), so no new scoring maths was
     needed — a short latecomer is, to the scorer, a withdrawer whose unplayed
     boards happen to be the early ones. `withdrawParticipant` gained a `LATE`
     `StandingChange` variant. Both `readRankingExclusions`/`readWithdrawals`
     now resolve through `resolveStandings` so the live leaderboard and the
     USEBIO export apply the identical gate.
   - **(b) Half-table at the start, pair never arrives — already the default.**
     "Cancel the AVE+/AVE− and treat the forced sit-out as a pre-scheduled
     sit-out" is exactly what the appliance already produces when a session
     starts one pair short: `SIT_OUT` rows credited 0.6 (`swissSitOutScoredBoards`).
     No new work — a one-pair-short start IS the pre-scheduled sit-out.
   - **(c) Half-table at the start, pair ARRIVES mid-session and plays the
     rest — DEFERRED (§9).** This is the part that needs a seat held by two
     pairs over disjoint board sets (early boards = without-standing sub, later
     boards = the real pair). That **identity layer now exists** — the
     first-class `seat_occupancy` model (`seat-occupancy-handover.md`, slice 1) —
     but the scoring/UX on top of it (that doc's slices 3–5) is deferred, so
     this case stays deferred too. Relaxing the "at most one sit-out"
     start rule (`start-validator.ts`) is only needed for THIS case, so it is
     deferred with it — case (a) needs no start-validator change (a latecomer is
     seated for the whole event and simply has unplayed early board rows).
7. **Director UI + docs.** A "Withdraw / mark absent" flow on the manage screen;
   update `docs/director-guide.md`. Each scoring step above ships with its own
   unit/int tests first; the UI lands once the scoring is trustworthy.
8. **(Deferred to the end) Stand-by → real-pair handover (§2.4.7 swap-in).** The
   mid-session case where a sub plays some boards "without standing" and the
   real pair reclaims the seat for the rest. The identity layer it needs — a seat
   held by two pairs over disjoint board sets — **is now built** (the first-class
   `seat_occupancy` model); its scoring/auth/UX remain (see §9 and
   `seat-occupancy-handover.md` §8, slices 3–5). Intentionally last, and only if
   real demand appears; the director can approximate it until then.

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

**Why the OLD model couldn't represent it.** `standing` used to be a single
enum on **one `participants` row keyed by `initialSeat`**, with board rows keyed
by **seat**, not by _who_ sat there — so a seat held exactly one pair identity
and one standing. It could say "the pair at A1NS does not count" or "withdrew",
but had **no way to say** "boards 1–6 at A1NS were played by a _different_,
without-standing pair, and boards 7–24 by the real pair who then counts". The
seat's results were an undifferentiated whole.

**The model change has since LANDED.** The identity layer was rebuilt around a
first-class **`seat_occupancy`** entity (see
[`seat-occupancy-handover.md`](./seat-occupancy-handover.md)), replacing
`participants` and `assignment`. An occupancy is `(seat, anchorId, board set,
players, standing, secret)`; a seat can now hold **different pairs over disjoint
board sets, each with its own standing**. The ordinary game is the degenerate
single whole-seat occupancy, so behaviour is unchanged until a handover is
recorded. This is the **clean occupancy-as-primary model, not the sidecar** the
first draft of that doc proposed — the sidecar (keeping `participants` primary
and bolting exceptions beside it) was rejected as blast-radius avoidance.

So the schema the faithful implementation needs now **exists**. What remains is
the behaviour on top of it (slices 3–5 of the handover doc): the per-board
scoring attribution (sub boards → opponents only; real-pair gap → AVE−), auth
resolving the occupant of a specific board, and the director handover UX.

**The director workaround is still wrong — do not use it.** Marking the seat
`WITHOUT_STANDING` for the whole session under-credits the real pair; flipping
it to `ACTIVE` on arrival **transfers the stand-in's board results to the real
pair**, which §2.4.9 forbids (the sub's boards are "without standing" — opponents
only — and the real pair gets AVE− for its unplayed early boards, no credit
transfer). Neither single-standing-per-seat value scores a handover correctly;
that is precisely what the occupancy model was built to fix.

**Still deferred:** the handover *feature* (slices 3–5) is not built yet — only
the identity layer it needs. Build it when real demand appears; a mid-session
stand-by handover is a rare club occurrence.

---

## 10. Expected-late empty seats at the start (§2.4.7 half-table) + the director UI

This section is an addendum: it covers the director-facing UI (build-order step
7) AND a pragmatic form of the §2.4.7 "half-table at the start" case (part of
the deferred §9), decided with the user. It is design-for-sign-off.

### 10.1 What we are adding

Two linked things:

1. **A standing-management UI** so a director can set a seated contestant's
   standing (`WITHDRAWN` / `LATE` / `WITHOUT_STANDING` / back to `ACTIVE`) — the
   scoring for all of these already exists (steps 3–6); this is the trigger.
2. **"Expected late" EMPTY seats at start.** A director may mark one or more
   empty seats as "expected late" so the game can **start short** — the marked
   seats stay genuinely unfilled (no participant row), the game runs, and the
   real pair is **seated later** (the "late arrival" literally walks in). The
   opponents of an empty seat are indemnified **AVE+/AVE− (cancel)** for the
   boards they cannot play while it is empty, per §2.4.7.

This is distinct from the deferred §9 "stand-by handover": there is **no
substitute** playing the seat's early boards — the seat is simply empty until
the real pair arrives. That makes it representable without the per-board
occupancy *scoring* §9 needs (slices 3–5), because an empty seat already flows
through the whole stack as a seat-id string with no occupancy (see §10.4).

### 10.2 Scope decisions (user-confirmed)

- **Model (a): mark the SEAT, not a placeholder pair.** The marked seat has **no
  participant row** at start. No placeholder names. When the pair arrives, the
  director seats them into that seat via the ordinary create-participant path —
  which is already enough, because the board rows and assignment were written at
  start keyed by seat id (§10.4).
- **Any number** of expected-late seats may be marked.
- **Start rule:** every expected seat must be **either seated OR marked
  expected-late**, and there may still be **at most ONE unmarked** empty position
  (the existing single sit-out). So `MULTIPLE_EMPTY_POSITIONS` /
  `HALF_FILLED_TABLE` fire only for seats that are neither seated nor marked
  late.
- **`WITHOUT_STANDING` is settable PRE-start** (a whole-session substitute is a
  setup decision); `WITHDRAWN` / `LATE` are **post-start** (mid-session scoring
  events).
- **Opponents' scoring:** AVE+/AVE− (the §2.4.4 before-half **cancel** branch,
  since an empty seat has played zero boards — see §10.5). If the pair never
  arrives this is exactly the "cancel → pre-scheduled sit-out" §2.4.7 fallback.
- **Round info** must tell the opponents their pair is **running late** — NOT a
  sit-out.

### 10.3 Where "expected late" is stored

A new lightweight per-game (`games` DB) table keyed by seat:

```ts
// expected_late_seats
seat: text("seat").primaryKey(),   // section-qualified, e.g. "A3EW"
```

A sentinel participant row is the wrong model (it would need player rows, be
counted as "seated" by `findPairs`, and resolve to fake names). A per-section
field is too coarse (can't name which seat). The seat-keyed table is the minimal
faithful store: present ⇒ "this empty seat is expected to be filled by a
latecomer". A row is removed when the pair is finally seated (or the director
clears it). Read alongside `findPairs` at start-validation time and at
leaderboard time.

### 10.4 Why an empty seat already flows through the stack (the key enabler)

The materialiser writes `boards.ns` / `boards.ew` as **seat-id strings straight
from the movement layout** (`buildSectionRows` → `sectionParticipantId`); it
never consults `participants`. Round-1 `assignments` rows are written the same
way. The schedule / traveller / scoring joins are all **seat-id ↔ assignment.id**,
independent of `participants`. And every seat→player-name resolution is already
null-safe: `buildAssignmentPlayerLookup` only inserts an entry when a participant
row exists, `tablePlayersFor` does `lookup.get(id)?.player1 ?? null`, and
`PlayerCard` renders a null player as "Empty". `findPairs` inner-joins players so
an empty seat simply produces no pair line (drops out of the ranking harmlessly,
exactly as the sit-out phantom already does).

So the ONLY layer that structurally rejects an empty-but-expected seat today is
**start validation**. Everything downstream already tolerates it.

**Seating the latecomer is just an insert.** Because board rows + the assignment
are pre-written keyed by seat, the "pair arrives" action is the ordinary
`createParticipant` (keyed on `initialSeat` = that seat) — no board rows are
rewritten. The schedule/traveller/leaderboard then resolve that seat to the new
players automatically. (The create-participant handler has no post-start guard,
so it already works mid-game; we remove the seat's `expected_late` row on seating.)

### 10.5 How the layers change

1. **Validation (`start-validator.ts` + `resolveSectionStart`/`resolveAllSections`).**
   Thread an **accounted-for** seat set (the `expected_late` seats for the
   section) into `validateStart`. Compute `missing = expected \ seated`, then
   `unaccounted = missing \ expectedLate`. `MULTIPLE_EMPTY_POSITIONS` /
   `HALF_FILLED_TABLE` are judged on **`unaccounted`** (still "at most one
   unmarked sit-out"); the single `sitOutSeat` is the lone `unaccounted` seat (a
   marked-late seat is NOT a sit-out). Marked-late seats are neither seated nor a
   sit-out — they materialise as themselves (next point).

2. **Materialisation.** A marked-late seat must become a **playable** row: its
   **real seat id** with status `NOT_PLAYED` — NOT the phantom/`SIT_OUT`
   encoding `applySitOut` produces. That is simply the ordinary
   `toMaterializable` path for that table (no sit-out transform applied to it),
   which already writes the real seat id + `NOT_PLAYED`. The only care needed:
   do not route a marked-late seat through `applySitOut` (which would phantom it
   and mark its boards `SIT_OUT`, hiding them from the traveller and treating it
   as a bye). The one genuine sit-out (if any) still goes through `applySitOut`.
   Movements with a built-in missing pair (spec `missingPair`) must still align
   correctly — the marked-late seat is a *normal* occupied position in the
   layout that just lacks a participant, so no movement regeneration is needed.

3. **Scoring (`leaderboard-service.ts`) — the exact §2.4.7 two-phase rule.** The
   White Book is explicit (reference §6.6): *"Boards that cannot be played
   meanwhile are scored **AVE+/AVE−**. But if the missing pair never arrives,
   those AVE+/AVE− scores are **cancelled** and the pairs forced to sit out
   instead have their scores factored in the usual way (the pre-scheduled-sit-out
   treatment)."* So there are TWO phases, discriminated by the seat's state:

   - **While still expected-late (the pair is coming):** the opponent of each
     unplayed board at the empty seat gets **AVE+ (0.6 of the board top)** — a
     real flat average-plus credit, NOT "play fewer boards". This is the
     **after-half AVE+** branch of `withdrawalCreditBoards`. We inject a synthetic
     record per marked-late empty seat and force the AVE+ branch for it (its
     `playedBySeat` is 0, so we must flag it as "credit the opponent AVE+
     regardless of the half-test" rather than letting the before-half cancel
     apply). `treatment: "REMOVE"` ⇒ no self-credit (no contestant to score).
     As the pair arrives and enters results, those rows gain results and drop
     out of the no-result loop, so the AVE+ naturally stops board by board.

   - **If the pair NEVER arrives:** the AVE+ is **cancelled** and the seat becomes
     a pre-scheduled sit-out. This is a terminal, director-driven transition —
     the director clears the expected-late mark (or converts it to the single
     sit-out) — at which point the existing sit-out path takes over and the AVE+
     synthesis stops (the seat is no longer in the expected-late set). The
     single-sit-out movement constraint governs this conversion, so it is a
     director action, not an automatic one.

   The seam: union a synthetic "empty-late" record into the `withdrawers` list
   next to `resolveStandings`'s output (which cannot see a participant-less
   seat), tagged so `withdrawalCreditBoards` applies the **AVE+** (opponent-
   indemnity) branch for it unconditionally. This needs a small extension to the
   pass: today its AVE+ is gated on `afterHalf`; an expected-late record must
   signal "always AVE+ the opponent" since the §2.4.7 "while expected" credit is
   not conditional on a half-test.

4. **Round info (`resolve-play-state.ts` / `schedule-service.ts` / `RoundInfo`).**
   Add an `opponentExpectedLate` signal to the round the opponent sees: true when
   the opponent seat for this round **has no participant AND is in
   `expected_late`**. Render a distinct "Your opponents haven't arrived yet
   (running late)" banner in `RoundInfo`, separate from the existing `sitOut` /
   `halfMatch` branches. The marked-late pair itself has no device until seated,
   so only the opponents' view matters.

### 10.6 The director UI (build-order step 7)

Reuse the existing **Tables setup screen** (`ShowTablesPage` + `DirectorTableModal`)
rather than a new screen, reached post-start via a new **"Manage Tables"** menu
button (`ManageGameMenu`, shown when `started`). The per-pair control in the
table modal becomes context-sensitive:

- **Empty seat, pre-start:** a "Expected late" toggle (marks/clears the
  `expected_late` seat) so the director can start short.
- **Seated pair, pre-start:** the existing **Evict**, plus a **"Without
  standing"** toggle (§2.4.9 substitute, a setup decision).
- **Seated pair, post-start:** **standing controls** — Active / Withdrawn /
  Late / Without standing; Withdrawn & Late also collect round + REMOVE/PENALISED
  + fine%. No eviction post-start (the F27 guard).
- **Empty marked-late seat, post-start:** a **"Seat the pair"** affordance (the
  ordinary create-participant flow) that also clears the `expected_late` row.

To show current state the client needs `standing` on the pair list, so
`findPairs` + the `Pair` type gain the lifecycle fields (step 2 below), and the
pair list / table view also reads the `expected_late` seats.

Transport: two director-authed socket events mirroring `traveller:*` —
`game:setParticipantStanding` (→ `withdrawParticipant`) and
`game:setSeatExpectedLate` (→ the `expected_late` store) — each
`assertDirector` → mutate → `broadcastParticipants` + `broadcastLeaderboardChanged`.

### 10.7 Teams

Expected-late empty seats are a **pairs** concern (teams require full teams at
every table — `validateTeamsStructure` rejects any sit-out). The standing UI's
WITHDRAWN/LATE/WITHOUT_STANDING still applies to teams (whole-team, keyed on the
home-NS seat), as the scoring already handles.

### 10.8 Non-goals (unchanged from §9)

The mid-session **stand-by handover** (a substitute plays the early boards
"without standing", then the real pair takes over) remains deferred — its
`seat_occupancy` identity layer is built, but the per-board scoring on top of it
is not (§9; `seat-occupancy-handover.md` slices 3–5). The expected-late case here
is strictly the **empty-seat** form (nobody plays the early boards), which is why
it is buildable now.
