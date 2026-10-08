# EBU White Book — App Audit

An audit of the Bridge Box Scorer code against
[docs/reference/ebu-white-book-scoring.md](./ebu-white-book-scoring.md) (the
captured EBU White Book 2025 scoring rules). It records, per topic, where the
code **diverges** from the White Book and where a required behaviour is a
**gap** (not implemented).

## How to read this

- **Status tags:**
  - **GAP** — the White Book requires a behaviour the app does not implement.
  - **DIVERGENCE** — the app implements the behaviour but differently from the
    White Book.
  - **FLAG** — a possible divergence that needs an EBU/regulatory decision to
    resolve (the "correct" value is genuinely ambiguous).
  - **OK** — verified to match the White Book (recorded so the audit is
    complete, not just a list of problems).
- **Severity** reflects scoring impact and likelihood, not effort:
  - **High** — can produce a materially wrong published result in a realistic
    club session, or a whole scenario is unhandled.
  - **Medium** — wrong in specific/edge situations, or a rule-of-correctness
    difference with usually-small numeric effect.
  - **Low** — cosmetic, by-design, or only reachable in configurations the app
    doesn't currently offer.
- **This is findings only.** No code was changed. Each finding notes a
  suggested direction, not a committed plan. Section numbers (§x.y) are the
  White Book's; `file:func` references are the app's.
- **Scope note.** The app runs Pairs, Teams, Swiss Pairs and Swiss Teams on a
  club LAN. Multi-stage qualifying, knockouts, teams-of-eight and all-play-all
  "events" (as a formal Conditions-of-Contest construct) are out of scope, so
  findings that only bite there are marked accordingly.

## Summary

| # | Topic | Status | Severity | Short description |
|---|-------|--------|----------|-------------------|
| F7  | Neuberg for short boards | DONE | **High** | FIXED: `neuberg-across-boards.ts` equalises short boards to the full field (E/A Neuberg) at both MP pooling seams |
| F18 | Cancel/foul a board | DONE | **High** | FIXED: `CANCELLED` status + `cancelBoardResult` + `traveller:cancelBoard`, plus a director UI — a "Cancel / Foul Board" branch on the adjustment hub using the same adjusted-score screen (any A<ns>/<ew> fault split), differing from a normal adjusted score only in the stored status |
| F19 | Teams unplayable / void match | DONE | **High** | §3.3.7 removed-board indemnity + §3.3.6/§3.3.9 whole-match void (flat 40/60, TD converse, §3.3.9 half-split) + §3.3.6.2 average-the-rest, for ALL teams formats: IMP-based (VP + aggregate IMP, ±3 IMP / per-team VP) and board-comparison (BAM/PAB, win-tie-loss / per-team boards-won). `REMOVED_TEAMS` + `VOID_MATCH` statuses, director UI |
| F24 | Withdrawals | GAP | **High** (known) | No withdrawal concept, indemnities, or score-to-withdrawer (§2.4) |
| F25 | Late arrivals | GAP | **High** (known) | No late-arrival / half-table-pending / stand-by handling (§2.3.3, §2.4.7) |
| F1  | AVE+/AVE− "better than average" | DONE (MP) | Medium | FIXED for matchpoints (standings): AVE+ = max(60%, windowed avg), AVE− = min(40%, avg), via `better-than-average.ts` at the MP leaderboard / Swiss-match / USEBIO-ranking seams; per-board display stays flat. IMP/XIMP deferred |
| F2  | "Offenders must not gain" | WONTFIX | Medium | §4.1.1.4 / Law 12C1b is a TD-judgement rule: the director chooses the weighted ruling and the weights that avoid favouring the offending side. The software's role is to support that judgement, not enforce it. No "offender" concept in the model; automating a clamp would risk overriding legitimate TD decisions. No code change — the director applies the lean manually |
| F8  | Small sub-fields | DONE | Medium | FIXED: §4.2.3.3 65/55 (2 results) / 70/60/50 (3 results) applied in `neuberg-across-boards.ts` when A∈{2,3} and A≤E/3 |
| F9  | Rounding "away from average" | DONE | Medium | FIXED (§4.2.6.1): each MP board is rounded to the nearest whole matchpoint, exact halves away from the board average (`max/2`), via `round-mp-boards.ts` as the LAST pass (after Neuberg equalisation + better-than-average + sit-out synthesis). Wired at the MP leaderboard / USEBIO-ranking / Swiss-MP-VP seams AND the per-board display, so a published total equals the sum of the shown board scores. Full precision carried through all intermediate calculation |
| F14 | XIMPQ normaliser | OK | Medium | RESOLVED (confirmed against the §3.1.3 source text): the White Book formula is `XIMPQ = XIMP / sqrt(rc/2)` with `r` = results, `c = r−1`, and XIMP = the pair's cross-IMP **sum** for the board. The code matches line-for-line: `computeCrossImps` (the sum) ÷ `Math.sqrt((r*c)/2)`. The earlier "√(N(N−1))" entry was an audit transcription error that dropped the `/2`. No code change |
| F29 | Swiss MP-VP overshoot crash | DONE | Medium | FIXED: a mixed artificial+real board in a Swiss MP-VP round could Neuberg-overshoot a real pair fractionally past 100%, which `mpVpFromPercent` rejected (threw). Now clamped to `[0, 100]` via `clampPercent` at all four MP VP seams in `swiss-vp-round.ts` before the VP-table lookup; the table's invariant guard stays for genuine misuse. Regression test in `swiss-mp-vp-overall.test.ts` |
| F20 | Swiss void-match formula | DONE | Medium | §3.3.9 half-split DONE for teams VP (`VOID_MATCH`) AND Swiss pairs (`VOID_PAIR`: match removed from the field, each pair credited an AVE+/AVE−/AVE blend by fault). Director-triggered void with the AVE− offender side |
| F21 | Swiss mismatch VP adjustment | DONE | Medium | FIXED (§3.5 + §3.5.2): the one-sided VP adjustment (higher+not-fault → 5+¾·actual; lower+own-fault → actual−¼·excess-over-5; else unchanged) for Swiss PAIRS and TEAMS (`swiss-mismatch.ts` + `MISMATCH` status + `match_ruling` column + director hub step), AND assisted DETECTION for BOTH pairs and teams: after a retroactive adjustment, the deterministic draw is replayed on round-scoped corrected standings to flag participants whose committed opponent is >5 VP from the correct one (teams exclude only the triple/bye participants of a round, not the whole round). Candidates surface in a director review screen (`/api/games/[gameId]/mismatch-candidates`) where the TD confirms fault → the existing adjustment. Judgement clauses (fault, the §3.5 "several valid alternatives" exception) stay with the director |
| F26 | "Without standing" | GAP | Medium (known) | Ranking excludes nobody; no opponents-count-but-not-self (§2.4.9) |
| F3  | Weighted-score precision | DIVERGENCE | Low | Integer % weights only; WB recommends up to 5 results, 2dp weights |
| F5  | AVE sum > 100% guard | note | Low | `A60/60` allowed with no outside-agency check (§4.1.1.1) |
| F6  | Bare AVE token dropped | note | Low | A plain `AVE` override is non-scoring; must be encoded `A50/50` |
| F10 | Pairs Butler/datum | note | Low | Datum-less IMP; no nearest-10 datum — not a selectable pairs mode |
| F11 / F28 | IMP/XIMP overall not board-scaled | DONE | Low | FIXED (§4.2.5): `overall/pair/{imp,x-imp}.ts` now rank and display the AVERAGE IMP/cross-IMP per board (`value / boards`), not the raw total, so a sit-out / removed-board pair is compared fairly. IMP overall view given 2dp (now fractional). Equal board counts leave the order unchanged |
| F15 | Long-match VP columns dropped | DIVERGENCE | Low (by design) | Swiss Pairs VP table omits 28–55 board columns; UI caps boards |
| F17 | Teams bye = 12 VP (hardcoded) | note | Low | Flat average-plus; consistent with EBU convention |
| F22 | Swiss draw repeat nuance | DIVERGENCE | Low | Avoid-repeat is binary; no 1.5×/triangle nuance; odd-field pick is bottom-of-field, not "near but below average" |
| F27 | Eviction post-start guard | note | Low | Director eviction route lacks the post-start guard `leave-table` has |
| F4, F12, F13, F16 | Weighted blend; teams VP scale; Swiss Pairs VP; half-matches | OK | — | Verified to match the White Book |

---

## 1. Adjusted scores (§4.1)

The adjustment encodings live in `src/model/adjusted-score.ts`: an **artificial
adjusted** score `A<ns>/<ew>` (e.g. `A60/40`) and a **weighted assigned** score
`W<pct>*<contract>;…`. Both are stored in `directorOverrideResult` with board
status `OVERRIDDEN` (`src/db/games/actions/set-board-result.ts:overrideBoardResult`).
The director enters them via the correction wizard
(`src/app/game/[gameId]/manage/travellers/CorrectResultPage.tsx`,
`StepAdjustedScore.tsx`, `StepWeightedScore.tsx`). Board-time valuation is in
`src/scoring/traveller/pair/{mp,imp,x-imp}.ts` + `assigned.ts`.

### F1 — AVE+/AVE− "better than average" override — DONE (matchpoints; IMP/XIMP deferred) (Medium)

> **Resolved for matchpoints (standings only).** Added
> `src/scoring/traveller/pair/better-than-average.ts`:
> `applyBetterThanAverage(scoredMpBoards)` re-values each pair's AVE+ side to
> `greater(60%, windowed average)` of the board top and its AVE− side to
> `lesser(40%, average)`, computed over the pair's REAL (non-artificial) boards
> in the window. It triggers only on an EXACT AVE+ (`60`) / AVE− (`40`) side — a
> custom percentage is the director's deliberate figure and left untouched — and
> falls back to the flat value when the pair has no real boards in the window.
> Each side is re-valued independently (so `A60/60` can legitimately exceed
> 100%, as the flat award already does).
>
> **Window = the aggregation seam's board set**, matching §8.80.6 for this
> single-session box: the Swiss *match* (applied per round in
> `swiss-vp-round.ts` `buildMpByBoard`) and the *session* / whole event
> otherwise (applied in `scoreBoardsToOverall` after Neuberg equalisation, and
> in the USEBIO MP *ranking*). The multi-session all-play-all window does not
> apply on this appliance.
>
> **Standings only, by design.** The per-board traveller/USEBIO `TRAVELLER_LINE`
> still shows the flat `A60/40` the board was awarded; only the pair's ranking
> reflects the uplift — exactly as commercial scoring programs present it. So a
> board can read "Adj 60%/40%" while the pair's leaderboard % reflects a higher
> value; that is intended, not a bug.
>
> **Deferred:** the IMP/XIMP "better than average" (a pair averaging +4 keeps +4
> for AVE+) — it shares the model but needs an IMP-average pass, and the
> Swiss-cross-IMP artificial path is a separate pre-existing gap. A
> **pre-existing latent crash** this surfaced (a mixed artificial+real board in a
> Swiss MP-VP round Neuberg-overshooting a real pair past 100%, which
> `mpVpFromPercent` rejected) has since been fixed separately as **F29**.

**White Book §4.1.1.1 / §8.80.6.** AVE+ is the *greater* of 60% and the pair's
actual average on the session's other boards; AVE− the *lesser* of 40% and the
pair's actual average. At IMPs, a pair averaging +4 keeps +4 for AVE+. The
averaging window ("session") is the match in Swiss, the stage in all-play-all,
else to the next major movement.

**Code.** `StepAdjustedScore.tsx` offers flat presets (AVE 50/50, AVE+/−
60/40, …) and a free 0–100 custom entry; `artificialPercents`/`parseAdjustedScore`
store exactly what's entered. `artificialImps` (`traveller/pair/assigned.ts`)
awards a flat **±3 / 0** by side. There is no code that computes a pair's
average on its other boards, and no session-window concept.

**Effect.** A strong pair given AVE+ gets 60% even if they were averaging 72% —
under-compensating the non-offender. Director could manually type the higher
percentage, but nothing computes it.

**Suggestion.** When valuing an artificial score, compute the side's average
over the appropriate window and take max(60%, avg) for AVE+ / min(40%, avg) for
AVE−. Requires a "session window" notion (trivially "the match" for Swiss;
"the session" otherwise). Consider deferring until the §8.80.6 window is modelled.

### F2 — No "offenders must not gain" constraint — WONTFIX (Medium)

**White Book §4.1.1.4 (Law 12C1b).** A weighted/assigned ruling must not let the
offending side gain; the weighting should lean to the non-offenders.

**Code.** There is no concept of which side offended anywhere in the scoring or
override path; weighted components are blended and applied symmetrically. No
clamp exists.

**Resolution — no code change.** This is a director-judgement rule, not a
mechanical scoring one. Under Law 12C1b the TD *decides* the assigned/weighted
score and chooses the components and weights so the offending side does not
gain; the White Book positions the software as *supporting* that ruling, not
enforcing it. Automating a clamp would require the model to know which side
offended (it does not) and would risk overriding a legitimate TD decision — the
director already enters exactly the figure they intend. The director applies the
lean manually when choosing weights. No code change.

### F3 — Weighted-score weights are integer-percent only — DIVERGENCE (Low)

**White Book §4.1.1.4.** Recommends software supporting up to 5 component
results with 2-decimal-place weightings (e.g. 0.33).

**Code.** `parseWeightedScore`/`buildWeightedScore` (`model/adjusted-score.ts`)
require integer percentages summing to exactly 100, any number of components.

**Effect.** A 33.33% weighting cannot be expressed exactly. Minor; integer
percentages cover almost all real rulings.

### F4 — Weighted scoring converts each component first, then blends — OK

**White Book §4.1.1.4 / §4.2.1.** Each component result is converted to
matchpoints/IMPs *before* the weighting is applied.

**Code.** Verified: `scoreMP`/`scoreXIMP`/`scoreIMP` each matchpoint/IMP a
component against the real field (`matchpointsAgainst` + `neuberg`,
`componentCrossImps`, `componentImps`) and then weight-average
(`weightedComponentScores`, weights as fractions). Correct.

### F5 — Artificial percentages may exceed 100% with no guard — note (Low)

**White Book §4.1.1.1.** The TD should not give adjusted scores summing to more
than 100% unless an outside agency was at fault (e.g. `A6060`).

**Code.** `A<ns>/<ew>` explicitly allows sides that don't sum to 100 (by
design — `A60/60` is a documented valid "AVE+ to both"). No outside-agency check.

**Effect.** Acceptable as director discretion, but there is no guard-rail or
prompt. Leave as-is unless a prompt is wanted.

### F6 — A bare `AVE` override is silently dropped — note (Low)

**Code.** On the pairs traveller path, `outcomeToScore` returns null for any
string that isn't a played contract / `PO` / `A…` / `W…`. A director override of
the literal string `AVE`/`AVE+` is therefore treated as a non-scoring line and
excluded from the field, rather than scored as 50%/60%. Averages must be entered
as `A50/50` etc.

**Effect.** A data-model trap for any future code (or import) that writes a bare
`AVE`. The USEBIO test fixture already stores `directorOverrideResult: "AVE"`,
which the pairs scorer would drop. Worth a validation guard or an explicit
decode.

---

## 2. Methods of scoring (§4.2)

Per-board pairs scoring: `src/scoring/traveller/pair/{mp,x-imp,imp}.ts`,
`assigned.ts`, `common.ts`; overall aggregation `src/scoring/overall/pair/*.ts`
+ `overall/common.ts`.

### F7 — Neuberg is not applied to boards with fewer real results — DONE (High)

> **Resolved.** Added `src/scoring/traveller/pair/neuberg-across-boards.ts`:
> `equaliseMpBoards(boards)` computes `E` = the largest line count of any board
> in the pooled field and scales every shorter board up to the common full-field
> top `2*(E−1)` via the existing `neuberg(doubledMp, A, E)` (which applies the
> White Book `((M+1)/A)·E − 1` through the `E/A` ratio). Director-assigned lines
> keep their chosen percentage (rescaled to the new top, not re-matchpointed);
> only real played lines are Neuberg-scaled. It runs post-scoring at both MP
> pooling seams — `scoreBoardsToOverall` in `leaderboard-service.ts` (before the
> sit-out synthesis, so byes are credited against the equalised top) and the MP
> branch of `computeOverallRanking` in `generate-usebio.ts` — and is a no-op when
> every board was played the same number of times. The Swiss-VP-per-round path
> is deliberately untouched (it converts each round's percentage to VP via the
> EBU table, which already normalises for boards played). Tests:
> `neuberg-across-boards.test.ts`.

**White Book §4.2.3.** A board played fewer times than the rest (sit-out,
fouled, played at fewer tables) must be matchpointed then **scaled by E/A**
(Neuberg: `((M+1)/A)·E − 1`), so every board is worth the same across the field.

**Code.** The Neuberg formula is implemented correctly in
`traveller/pair/assigned.ts:neuberg`, **but** `scoreMP` (`traveller/pair/mp.ts`)
only uses it to scale from the real-line comparison count up to
`fullComparisons = totalLines - 1`, where `totalLines` = real lines **+
same-board director-assigned lines**. It is never scaled up to the session's
*expected* field size `E`. A board genuinely played at fewer tables is
matchpointed over its own smaller `max = 2*(N-1)` with no equalisation to the
other boards. The overall aggregator ranks by `totalMP / maxMP`
(`overall/pair/mp.ts`), which equalises board *weight* only in the weak sense
that a smaller board contributes a smaller `max` — this is **not** the White
Book per-board Neuberg and gives different matchpoints.

**Effect.** In any session where boards are played a different number of times
(e.g. a sit-out table, a board fouled at one table, most Mitchell/skip
movements with a half-table), the matchpoints on the short boards are wrong
relative to full boards, skewing the ranking. This is the single most
impactful scoring correctness gap.

**Suggestion.** Thread the expected field size `E` (the maximum results any
board of the session has, or the movement's expected top) into `scoreMP` and
apply `neuberg(raw, A, E)` for real-played short boards — reusing the existing
`neuberg`. Also decide the §4.2.3.3 small-sub-field path (F8) for A ≤ 3.

### F8 — Small sub-fields (65/55, 70/50) not implemented — DONE (Medium)

> **Resolved** alongside F7, in the same `neuberg-across-boards.ts`. When a
> board's real group is `A ∈ {2,3}` AND at most a third of the field (`A·3 ≤ E`),
> `rescaleBoard` awards fixed percentages of the full-field top instead of
> Neuberg: a group of 2 → 65% / 55%, a group of 3 → 70% / 60% / 50%, with ties
> landing midway. Implemented as `Percentage = 60% + (m − (A−1)/2) × 10%` on the
> single-matchpoint scale `m`. (Note: this corrected the reference doc, which
> printed the EBU form `60% + (M − (A−1)) × 5%` without noting `M` is on the
> *doubled* scale — see §2.3 of `ebu-white-book-scoring.md`.) Tests cover both
> the 2- and 3-result cases and the fall-back to Neuberg when the group exceeds a
> third of the field.

**White Book §4.2.3.3.** When a board's group of results is at most 3 (and ≤ a
third of the field), score it with top=65%/bottom=55% (2 results) or
70%/50% (3 results), not the Neuberg formula.

**Code (before fix).** Not present. A 2-result board was matchpointed 2/1/0.

**Effect.** Fouled/odd-count boards with 2–3 results are compensated less
generously than the regulation. Pairs with it. Lower frequency than F7 but same
root (short-board handling).

### F9 — "Halves away from the average" per-board rounding — DONE (Medium)

**White Book §4.2.6.** No rounding mid-calculation; a single board's score is
rounded to the nearest scoring unit with **exact halves rounded away from the
average**. For matchpoint pairs the unit is **one matchpoint** on this
codebase's doubled scale (a pair beaten = 2, a tie = 1), and a board's average
is half its top (`max / 2`).

**Fix.** A pure pass `roundMpBoards` (`src/scoring/traveller/pair/round-mp-boards.ts`)
rounds each line's matchpoints to the nearest whole matchpoint, breaking an
exact half AWAY from `max/2` (above-average halves up, below-average halves
down), and keeps `ew = max − roundedNs` so each board still sums to its top.
Because `max = 2*(A−1)` is always even, the average is integral and a `.5` value
can never equal the average, so the direction is always unambiguous.

Per §4.2.6.1 it runs **LAST**, after everything that must be computed at full
precision: per-board `scoreMP`, the §4.2.3 cross-board Neuberg / small-sub-field
equalisation (`equaliseMpBoards`), the §4.1.1.1 better-than-average standings
uplift (`applyBetterThanAverage`), and the Swiss sit-out synthesis. It is wired
at all three standings seams (`leaderboard-service.ts`, the USEBIO MP ranking in
`generate-usebio.ts`, and `swiss-vp-round.ts buildMpByBoard`) and on the
per-board display plugin (`plugins/per-board/mp.ts`), so the overall ranking
sums exactly the rounded board scores the traveller shows — the consistency
§4.2.6.1 exists to guarantee.

**Note.** On a very small field (e.g. a top of 2) there is no whole matchpoint
that represents 60%, so a rounded AVE+ can collapse to the nearest unit (1.2 →
1). That is a faithful consequence of the 1-MP scoring unit, not a bug.

**Earlier state (for reference).** The pairs per-board scorers previously
returned full-precision floats with no rounding; the percentage display used
`numberCell(.., 2)` → `toFixed(2)` (JS half-to-even/up, not "away from
average"); only `swiss/swiss-vp-round.ts` had a `roundHalfAwayFromZero` helper
(correct there because signed IMP totals have zero as their average).

### F10 — Pairs IMP scorer is datum-less; no Butler datum — note (Low)

**White Book §4.2.4 / §4.2.6.2.** Butler/datum IMP scoring computes a datum
(rounded to nearest 10) and IMPs each result against it.

**Code.** `traveller/pair/imp.ts` IMPs each line against an implicit datum of 0
(both sides floored at 0). No datum is computed. However, IMP is not a
selectable *final* scoring type for pairs (pairs are MP or Cross-IMP); this path
is a traveller display only. Low impact / not reached in normal play.

### F11 / F28 — IMP/Cross-IMP overall scaled by boards played — DONE (Low)

**White Book §4.2.5.** All boards count equally; when contestants play different
numbers of boards the final score is scaled by the number of boards played (the
worked example expresses matchpoints as a percentage, i.e. a per-unit average).

**Fix.** `overall/pair/x-imp.ts` and `overall/pair/imp.ts` now rank AND display
the **average** per board — `data.value / data.boards` (guarding a zero board
count) — the cross-IMP/IMP analogue of the matchpoint percentage the MP overall
(`overall/pair/mp.ts`) already uses. The shared `Totals` accumulator already
tracks each pair's board count, so this is a one-line change per scorer. A
Swiss sit-out credits 0 cross-IMPs/IMPs for the missed board (a neutral par
board) and that board counts toward the divisor, so a forced bye neither helps
nor hurts the average.

**Display.** The IMP overall view now shows 2 decimals (it is an average, so
fractional), matching the Cross-IMP view; `buildImpView`'s `decimals` doc was
updated accordingly.

**Effect.** Fixes the real inconsistency with the MP path: a pair that sat out
or had a board removed in a Cross-IMP (or IMP) pairs game is now compared on its
per-board average rather than a smaller raw total. With equal board counts every
pair is divided by the same count, so the order is unchanged.

---

## 3. Victory Points (§3.1)

Swiss VP code: `src/scoring/swiss/{imp-vp-table,mp-vp-table,swiss-vp-round,teams-vp-overall}.ts`.

### F12 — Teams-of-four IMP→VP scale matches EBU — OK

**White Book §3.1.1.** The WBF discrete teams-of-four VP scale.

**Code.** `imp-vp-table.ts` is ported verbatim from the EBU's own `vps.js`
generator (continuous-curve inversion at half-integer VPs + concavity
correction), with a comment to that effect, used on the 20-VP pool. Verified to
reproduce the published tables. Correct.

### F13 — Swiss Pairs %→VP scale matches EBU — OK

**White Book §3.1.7.** VP from a pair's percentage of available matchpoints,
keyed by board count, "not exceeding" boundaries.

**Code.** `mp-vp-table.ts` holds the EBU threshold tables (10-VP half, 20-VP
full), "not exceeding" lookup, 2-dp pre-rounding. Matches the captured scale
(sample rows cross-checked). Correct. See F15 for the dropped long-match columns.

### F14 — Cross-IMP→VP normaliser √(rc/2) matches the source — OK (Medium)

**White Book §3.1.3 (verbatim).** On each board, the cross-IMPs for a pair are
divided by √(rc/2):

```
XIMPQ = XIMP / sqrt(rc/2)
```

where **r** = number of results, **c = r − 1** = number of comparisons, and
**XIMP** = the pair's cross-IMP total (sum) for the board. The round/match
XIMPQ total is rounded to whole IMPs (§4.2.6.3) and the §3.1.1 teams-of-four VP
scale applied. The source explicitly identifies this as EBUScore SwissPairs'
`( / sqrt(rc/2))`.

**Resolution.** The code matches the source line-for-line.
`swiss-vp-round.ts:buildXimpByBoard` computes
`computeCrossImps(score, field) / Math.sqrt((r * c) / 2)`, where
`computeCrossImps` is the per-board cross-IMP **sum** over the field (the
self-term `score − score` contributes 0, so it is the sum over the `c = r − 1`
comparisons — exactly the XIMP numerator) and `r`/`c` are defined as above. The
earlier "√(N(N−1))" entry in this audit was a transcription error that dropped
the `/2`; the implementation was correct all along.

**Verification.** The identical `sqrt(r*c/2)` factor is used everywhere XIMPQ is
computed — the per-round scorer, the overall scorer, the void-pairs path, and
the independent re-derivation in `swiss-ximp-vp-overall.test.ts` — and the
resulting VP outputs were cross-checked against the captured EBU scales. No code
change.

### F15 — Swiss Pairs VP table drops 28–55 board columns — DIVERGENCE (Low, by design)

**Code.** `mp-vp-table.ts` intentionally omits the 28–39 and 40–55 board
columns, and the UI caps boards/round so a match never needs them. Documented as
a decision. Fine for club-length matches; recorded for completeness.

### F16 — Half-matches scored on 10-VP with AVE+/AVE compensation — OK

**White Book §3.1.7(c) + §3.3.9-style half credit.** Odd-field "2 half matches":
each half on a 10-VP scale; the missing half credited AVE+/AVE.

**Code.** `swiss-vp-round.ts` scores each real half via `mpVpFromPercent(..,10)`
/ `impVpSided(..,10)` and the compensated half via `compensationSplit`
(`ceil(n/2)` boards AVE+ at 0.6 MP / +2 XIMP, the rest AVE at 0.5 / 0). Matches
the captured rule. Correct.

### F17 — Teams bye = 12 VP (hardcoded) — note (Low)

**Code.** `teams-vp-overall.ts:BYE_VP = 12` (an average-plus on the 20-VP pool =
60%). The captured doc doesn't give a fixed teams-bye VP, but the EBU convention
is average-plus, so 12/20 is consistent. Hardcoded; fine.

---

## 4. Unplayable / cancelled boards (§3.3)

### F18 — No way to cancel/foul a board; pairs §3.3 handling is manual-only — DONE (High)

> **Resolved (backend + director UI).** Added a first-class fouled-board
> path:
> - New board status `CANCELLED` (`db/games/types/board-status.ts`): a board a
>   director declares could not be played in its intended form (fouled,
>   mis-dealt, arrow-switched, out of time). It carries an artificial adjusted
>   score in `directorOverrideResult`, so it still occupies a seat in the field
>   and the correctly-played copies form a Neuberg-scaled sub-field (via the
>   F7/F8 work) — while being distinguishable from a plain `OVERRIDDEN` score
>   correction.
> - `cancelBoardResult` DB action (`db/games/actions/set-board-result.ts`) takes
>   the director's chosen artificial adjusted score (`A<ns>/<ew>`) and writes it
>   with `status = CANCELLED`. A director-authed `traveller:cancelBoard` socket
>   event + handler (`socket/handlers/results/cancel-board.handler.ts`) validates
>   the result is an adjusted score, mirrors the override handler, and fans out
>   the usual occupancy-gated live snapshots. The TD chooses the fault split
>   freely (per §3.3.2 / §4.1.1.1: A60/60 outside agency, A50/50 extenuating,
>   A60/40 or A40/60 one side at fault, A40/40 both) — the app does not constrain
>   it to a fixed menu.
> - `CANCELLED` is now treated as finalized/playable everywhere `OVERRIDDEN` is:
>   `get-results-summary.ts`, `round-status.ts` `isBoardEntered`, and both
>   Swiss draw-complete checks. Also fixed a latent `usebio-service.ts` filter
>   bug that dropped any board with a `directorOverrideResult` but no
>   `confirmedResult` (a pure director assignment / cancellation) from the
>   export.
>
> **Director UI.** Tapping a traveller row now opens an adjustment-type hub
> (`StepAdjustmentType`) with four branches: Enter Contract, Adjusted Score,
> Weighted Score, and **Cancel / Foul Board**. The cancel branch reuses the same
> `StepAdjustedScore` screen as the Adjusted Score branch — the director picks
> any A<ns>/<ew> split (presets or custom) — and emits `traveller:cancelBoard`
> (`CorrectResultPage.saveCancel`). The *only* difference from a normal adjusted
> score is the stored status (`CANCELLED` vs `OVERRIDDEN`); the outcome and its
> "Adj X%/Y%" rendering are identical. The contract branch keeps its Confirm
> review; the adjusted/weighted/cancel branches commit on their own action. The
> director-only Adjusted/Weighted buttons that used to sit on the Level step
> moved to the hub, so `StepLevel` is now identical to the player view. Note the
> §3.3.2 **sub-field** path (played more than once) is handled separately by
> F7/F8.

**White Book §3.3.2.** A pairs board played once in a form is cancelled and
given an artificial adjusted score; played more than once, scored as a sub-field.

**Code.** The board-status enum (`src/db/games/types/board-status.ts`) has
`NOT_PLAYED / PENDING_CONFIRMATION / CONFIRMED / OVERRIDDEN / SIT_OUT /
HALF_AVERAGE` — **no** fouled/cancelled/unplayable/void state. The only director
board mutation is `overrideBoardResult` (→ `OVERRIDDEN` with a result/`A…`/`W…`).
So "cancel this board" does not exist; the §3.3.2 adjusted-score outcome is only
reachable if the director manually types an `A<ns>/<ew>`, and sub-field scoring
is subsumed by the (missing) Neuberg short-board path (F7).

**Effect.** No first-class "this board couldn't be played / was fouled" action;
directors must improvise with an override, and the short-board scoring that
should follow isn't applied (F7/F8).

**Suggestion.** Add a cancelled/fouled board status (or a dedicated adjust
action) that drives the §3.3.2 outcome and the §4.2.3 short-board scoring.

### F19 — Teams unplayable / void-match handling — DONE (High)

> **§3.3.6 / §3.3.9 whole-match void: DONE for teams VP.** Added a `VOID_MATCH`
> board status + `model/teams-match-void.ts` (`VoidCause` + `VOID:<cause>` token
> + `voidMatchVp`): `SEATING_STANDARD` → both 40%, `SEATING_TD` → both 60%
> (§3.3.6.1 flat/converse), and `SHORT_*` → the §3.3.9 AVE+/AVE− half-board
> split (`±3·⌈N/2⌉` IMPs, read per-side off the N-board scale). The teams VP
> scorer (`calculateTeamsVpOverall`) detects a void match via `matchVoidCause`
> and credits each team its ruling VP directly instead of margin→VP; the
> expected board count N is threaded in from the movement's `boardsPerRound` via
> `readLeaderboardInputs`. `voidTeamsMatch` DB action + `traveller:voidTeamsMatch`
> socket event/handler, and a director "Void Match (Teams)" hub branch →
> `StepVoidMatch` (two seating options + four §3.3.9 fault options). **This also
> resolves the F19 ±3 limitation**: because a void gives each team an absolute
> VP, both-at-fault (both below average) and neither-at-fault (both above) are
> now distinguishable. §3.3.6.2 ("≥half played, average the rest, full scale")
> is handled by the existing removed-board path with a `NEITHER_FAULT` (0-swing)
> removal per un-played board, which counts toward the full board total so the
> VP scale is the full N.
>
> **Board-comparison teams (BAM/PAB): DONE too.** The same `REMOVED_TEAMS` /
> `VOID_MATCH` rulings apply in native board-won units — a removed board is a
> win/tie/loss for the home team by fault (`teamMatchBoardWins`), and a void
> credits each team a boards-won total: flat `0.4·N` / `0.6·N` (§3.3.6.1) or the
> §3.3.9 per-board `0.6/0.5` vs `0.4/0.5` half-split (`voidMatchWon`).
> `expectedBoards` is threaded into the board-comparison scorer the same way,
> the hub branches show for every teams game, and the ruling steps adapt their
> wording (board wins vs IMPs/VP) via a `boardComparison` flag.

> **§3.3.7 removed-board indemnity: DONE for IMP-based teams (VP + aggregate
> IMP).** Added:
> - New board status `REMOVED_TEAMS` (`db/games/types/board-status.ts`): a board
>   removed from a teams match that could not be played, carrying a `TRM:<fault>`
>   token in `directorOverrideResult`.
> - `model/teams-removed-board.ts`: the 4-way `TeamsRemovalFault`
>   (`EW_FAULT`/`NS_FAULT`/`BOTH_FAULT`/`NEITHER_FAULT`), token build/parse, and
>   `removedBoardNsSwing` (±3 / 0 to the NS seat).
> - `teamMatchBoardImps` (`scoring/swiss/team-match.ts`) now detects a removed
>   board and contributes the fixed ±3 IMP swing (home perspective, inverting
>   when the token sits on the opponent room) and counts it toward
>   `boardsPlayed`, so the VP scale uses the full board count. This flows into
>   both `calculateTeamsVpOverall` and `calculateTeamsImpAggregateOverall`.
> - `removeTeamsBoardResult` DB action + director-authed
>   `traveller:removeTeamsBoard` socket event/handler, and a director UI: a
>   "Board Not Played (Teams)" branch on the adjustment hub (shown only for
>   IMP-based teams games) → a 4-way fault step (`StepTeamsRemoval`).
> - `REMOVED_TEAMS` treated as finalized/playable everywhere OVERRIDDEN/CANCELLED
>   are.
>
> **Known limitation (deferred to the void work).** The match margin is a single
> zero-sum figure, so `NEITHER_FAULT` (both +3) and `BOTH_FAULT` (both −3) both
> net to a 0 swing in the margin alone; the whole-match void path (above) now
> resolves this with per-team absolute scores, and the stored fault token
> preserves the director's choice.
>
> **Now fully implemented for all teams formats** (IMP-based + board-comparison).
> The Swiss-*pairs* void (§3.3.8/§3.3.9) is also done — see F20 (`VOID_PAIR`).

**White Book §3.3.6–3.3.9.** Incorrect seating / void match → both teams 40% of
VPs (converse if the TD erred); ≥ half the boards played → averages on the rest,
same VP scale; part-match → +3/−3 IMPs per removed board; < half → void.

**Code (before fix).** `swiss/team-match.ts:teamMatchBoardImps` silently
**skips** any board without a comparable result in both rooms and scores over
`boardsPlayed`; `teams-vp-overall.ts` converts the resulting margin to VP with no
void/averaging/removed-board logic.

**Effect.** A teams match that is partly or wholly unplayable (late arrival,
foul, seating error) is scored only on whatever boards happen to compare, with
no indemnity or void treatment — can produce a materially wrong VP result.

**Suggestion.** Model a "removed board" / "void match" outcome and apply the
§3.3.7–3.3.9 VP effects. Overlaps with the late-arrival/withdrawal work (§6
below), since those are the usual causes.

### F20 — Swiss void-match formula — DONE (Medium)

> **DONE for teams VP** (part of F19) and **DONE for Swiss pairs**.
>
> **Teams:** the §3.3.9 half-board AVE+/AVE− split is in `teams-match-void.ts`
> (`voidSplitVp`), applied by the teams VP scorer on a `VOID_MATCH` `SHORT_*`.
>
> **Swiss pairs:** because pairs are scored against the whole section field (not
> head-to-head), a voided pairs match is handled per-pair: the match's rows are
> a new `VOID_PAIR` status, **excluded from the field** the other pairs are
> matchpointed against (`byBoardOf` in `swiss-vp-round.ts`), and each of the two
> pairs is credited an AVE+/AVE−/AVE blend over the match's boards by fault.
> This reuses the odd-field compensation primitive
> (`swiss-half-match.ts` `compensationSplit` → ⌈n/2⌉), extended with the AVE−
> **offender** side the bye compensation never needed (`voidMpFractions` /
> `voidXimpPerComparison`, 0.4 top / −2 IMP). The cause is recorded as a
> `VOIDP:<cause>` token (`model/pairs-match-void.ts`); `creditVoidPairs` in
> `swiss-vp-round.ts` scores both pairs off the void-excluded field. Director
> UI: a "Void Match (Pairs)" hub branch (gated to Swiss Pairs) →
> `StepPairsVoid` → `voidPairsMatch` / `traveller:voidPairsMatch`. `expectedBoards`
> (from the movement) sizes the ⌈N/2⌉ split, threaded through the pairs VP
> scorers the same way as teams.
>
> This is independent of the missing-contestant work (F24/F25): a director can
> void any pairs match directly. F24/F25 would later *drive* this automatically
> for a withdrawn/absent pair.

**White Book §3.3.9.** A void match: AVE+/AVE− to NOS/OS on half the boards
(rounded up), AVE/AVE on the rest. Referenced by §2.4.6 (missing contestant in a
Swiss event).

---

## 5. Swiss mismatches and the draw (§3.5, §3.6)

Draw engines: `src/movement/swiss/swiss-pairing.ts`,
`src/movement/swiss-teams/swiss-teams-pairing.ts`; orchestration
`src/services/draw-swiss-round-service.ts`.

### F21 — Mismatch VP adjustment (director-declared) — DONE (Medium)

**White Book §3.5 / §3.5.2.** If a contestant is drawn against opponents whose
score differs from the correct opponents' by > 5 VP, it's a mismatch. Typically
ONE side is mismatched; its VP is adjusted (not-at-fault vs a higher opponent →
`pool/4 + ¾·actual`; own-fault vs a lower opponent → `actual − ¼·(VPs over
pool/4)`; the other two combinations leave the actual score). The constant is a
quarter of the VP pool: **5** on the ordinary 20–0 scale, **2.5** on the 10–0
scale of a triangular (triple) comparison. The opponent is untouched and the
match result stands.

**Fix (the §3.5.2 adjustment).** `src/model/swiss-mismatch.ts` holds the pure
formula `adjustMismatchVp(actual, ruling, pool)` (worked examples verified: a
12-VP win → 14; a 13-VP win → 11) and the `MM:<side>:<direction>:<fault>` token
codec. The ruling is director-DECLARED through the correction hub (a new
"Mismatch (Swiss)" step → side, then the §3.5.2 treatment), persisted via a
`traveller:markMismatch` socket handler that stamps a new `MISMATCH` board
status and the token into a NEW `match_ruling` column (games migration 0004) on
every row of the match room. Because the boards stay REAL and in the field
(only the ruling, not a score, lives in the new column), the Swiss VP scorers
read `match_ruling` and recompute ONLY the mismatched side's round VP: pairs via
a `creditMismatch` pass in `scoreSwissVpRound`, teams via `matchMismatch` +
`adjustMismatchVp` in `calculateTeamsVpOverall` (home-relative, side inverted if
the token sits on the opponent room). Covers Swiss PAIRS and TEAMS.

**Assisted DETECTION (pairs).** The real trigger is a retroactive adjustment: a
later round is drawn from round-N standings, then a director adjusts an EARLIER
round's board, so the committed later draw no longer matches what the corrected
standings would have produced. Because the Swiss draw is deterministic this is
reconstructable:

- `computeSectionLeaderboardsAsOf(db, gameId, R)` recomputes the standings over
  rounds `< R` using CURRENT (adjusted) values — the "corrected standings as of
  R" the round-R draw should have used.
- `getSwissBoardHistory(…, R)` (round-filtered) + that order rebuild the exact
  `SwissDrawInput`; `drawSwissRound` replays it to get the "correct" opponents.
- `getSwissCommittedRound` recovers the opponents actually played, verbatim from
  the board rows.
- `detectRoundMismatches` (`scoring/swiss/detect-mismatch.ts`) diffs the two and
  flags a pair when its actual vs correct opponent differ by > 5 CURRENT VP,
  tagging the higher/lower direction. `detectSectionMismatches` scans every
  committed round, skipping rounds already ruled and half-match rounds.

Candidates are read via a director GET (`/api/games/[gameId]/mismatch-candidates`)
and shown on a "Review Mismatches" screen; the director confirms fault (or
dismisses — the §3.5 "several valid alternatives" exception), which emits the
existing `markMismatch` adjustment. Detection ASSISTS; the two irreducible §3.5
judgements — fault attribution and the valid-alternatives exception — remain the
director's. The draw advisories (`evaluateSwissSeating`) are unchanged.

**Teams detection.** Done too — the teams draw (`drawSwissTeamsRound`) is
deterministic for later rounds (its RNG is only in round 1, never replayed), so
the same replay-and-diff works. `detect-teams-mismatch.ts` +
`swiss-teams-committed.ts` rebuild the corrected teams draw and diff each team's
committed vs correct opponent. An odd-field TRIPLE or BYE round is NOT skipped
wholesale: only the teams actually IN the triple/bye are excluded, and the
ordinary head-to-head tables of that round are still assessed. The detection
service dispatches pairs → `detectPairsSectionMismatches`, teams →
`detectTeamsSectionMismatches`, behind one `SectionMismatchCandidate`
(`participantKind: PAIR | TEAM`); the review screen renders either.

**Granularity (pairs and teams).** A 2-half-matches group (pairs) or a
triple/bye (teams) in a round is NOT skipped wholesale: only the participants
actually IN the half-match group / triple / bye are excluded (for pairs, in
EITHER the committed round or the corrected replay — a corrected draw can itself
produce a half-match), and the ordinary head-to-head tables of that round are
still assessed. The excluded cases are left to a manual director ruling.

### F22 — Repeat avoidance is binary; odd-field selection differs — DIVERGENCE (Low)

**White Book §3.6.** Re-matches tolerated at "one and a half times"
(ordinary/long + short triangle); the odd competitor should be placed "near but
below average".

**Code.** `pairUp` (both engines) treats any prior meeting as cost 1 and
minimises total repeats (`hadUnavoidableRepeat` flag). There's no 1.5×
weighting, no triangle-aware repeat logic, and no avoidance of repeats *within* a
formed triple (reported as an advisory only). `chooseSitOut` /
`chooseHalfMatchGroup` / `chooseTeamBye` / `chooseTeamTriple` pick from the
**bottom of the field** (with once-per-event fairness), not "near but below
average".

**Effect.** Draw-quality nuance, not a scoring error — the draws are legal and
avoid repeats where possible. Divergence from EBU practice, low priority.

### F23 — Draw fundamentals present — OK

Repeat-avoiding pairing, director override of the draw, and odd-field handling
(bye / 2-half-matches / triples) all exist and work. Only the §3.6 nuances above
diverge.

---

## 6. Late arrivals and withdrawals (§2.3–§2.4)

This whole area is **known-unimplemented** — `ebu-white-book-scoring.md` §6
carries a "Not yet implemented" banner. Recorded here so the audit is complete
and the gaps are itemised for the implementation work.

### F24 — Withdrawals entirely unimplemented — GAP (High, known)

**White Book §2.4.** No withdrawal concept exists. `deleteParticipant`
(`src/db/games/actions/delete-participant.ts`) hard-deletes the participant and
player rows and leaves any entered board rows orphaned; there is no "withdrawn"
state or column (`participants.ts` has none). None of the §2.4 scoring applies:
no cancel-before-half / stand-after-half, no indemnity to opponents (own
average / converse / 60% of max VPs / first-3-boards-AVE+), no AVE−-plus-fine to
the withdrawer. Leaving/eviction are **setup-only** (`leave-table.handler.ts`
blocks after start via `isGameStarted`).

### F25 — Late arrivals entirely unimplemented — GAP (High, known)

**White Book §2.3.3 / §2.4.7.** No late-arrival handling: no half-table-pending
state, no stand-by 45/90-minute rights, no "retain standing if present for half
the boards", no AVE+/AVE− for boards unplayable due to lateness. **SIT_OUT is a
pre-planned one-pair-short movement/phantom construct** (`start-validator.ts`
`sitOutSeat`, `start-game-service.ts` `applySitOut`), decided at start from the
gap between seated pairs and the movement — it is **not** a late/missing-pair
mechanism and must not be confused with one.

### F26 — "Without standing" ranking exclusion absent — GAP (Medium, known)

**White Book §2.4.9.** No concept of a contestant whose results count for
opponents but not for themselves. `rank.ts` ranks every id present in the
aggregated totals; `overall/common.ts:buildOverallScore` has no exclusion hook.

### F27 — Director eviction lacks the post-start guard — note (Low)

The player `leave-table` path blocks leaving once the game has started
(`isGameStarted`), but the director eviction route
(`src/app/api/games/[gameId]/participants/[seat]/route.ts` DELETE →
`deleteParticipant`) has **no** post-start guard. A director could evict a seated
pair mid-game, hard-deleting it with no defined scoring consequence. Worth either
a guard or (better) folding eviction into a proper mid-game
withdrawal/without-standing flow once that exists.

---

## Suggested priority order

Grouped by what delivers correct published results soonest:

1. ~~**F7 + F8 + F18**~~ — DONE. Short-board / cancelled-board scoring (Neuberg
   to E, small sub-fields, cancel/foul status).
2. ~~**F19 + F20**~~ — DONE. Teams unplayable / void-match VP (incl. BAM/PAB) and
   Swiss-pairs void.
3. **F24 + F25 + F26 (+ F27)** — the late-arrival / withdrawal / without-standing
   feature. Large and already flagged as a planned feature; folds in F27 and
   much of §6 of the reference doc. Also the usual cause of F19. **Still open —
   deferred to the end by request.**
4. **F1** DONE for matchpoints (IMP/XIMP deferred); **F2** WONTFIX (TD-judgement
   rule, no mechanical clamp). AVE+/AVE− "better than average" + the offenders
   constraint.
5. ~~**F14**~~ — RESOLVED. The XIMPQ normaliser is correct as implemented (no
   code change).
6. ~~**F9**~~ DONE (per-board §4.2.6.1 rounding), ~~**F11/F28**~~ DONE (§4.2.5
   board-scaling), ~~**F21**~~ DONE (§3.5.2 director-declared mismatch VP). Still
   open: **F3, F5, F6** — correctness-polish and nuance items. Plus the latent
   crash ~~**F29**~~ DONE.

---

*Audit date: against the repo state at the time of writing. Source of truth for
the rules: [ebu-white-book-scoring.md](./ebu-white-book-scoring.md) (EBU White
Book 2025). This document records findings only; no code was changed.*
