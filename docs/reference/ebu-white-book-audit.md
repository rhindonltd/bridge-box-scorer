# EBU White Book — App Audit

A fresh audit of the Bridge Box Scorer code against the **definitive source**:
the EBU White Book 2025 (`docs/reference/ebu-white-book-2025.pdf`, "29 July 2025
FINAL DRAFT"). Section numbers (§x.y) are that PDF's. Each finding was derived by
reading the White Book text and then the actual code it governs; `file:function`
references are the app's.

This audit was written from scratch against the PDF and does **not** inherit the
conclusions of any earlier audit or of `ebu-white-book-scoring.md`.

## How to read this

- **Status tags:**
  - **OK** — code verified to match the White Book.
  - **GAP** — the White Book requires a behaviour the app does not implement.
  - **DIVERGENCE** — the app implements the behaviour but differently.
  - **PARTIAL** — implemented for some scoring methods / cases but not all.
  - **FLAG** — a point needing an EBU/regulatory decision or where the correct
    value is genuinely ambiguous.
  - **WONT-IMPLEMENT** — a divergence that is a deliberate product decision; the
    app knowingly does not follow this rule and that is accepted. No action.
  - **TD-JUDGEMENT** — a director/TD ruling, not a mechanical scoring step; the
    software supports it (lets the director enter the ruling) rather than
    enforcing it. No code gap.
- **Severity** reflects scoring impact × likelihood in the app's scope, not
  effort: High / Medium / Low.
- **Scope.** The app runs **Pairs, Teams, Swiss Pairs and Swiss Teams on a club
  LAN**. Out of scope (findings that only bite there are not raised): teams-of-
  eight-or-more (§3.1.4, §3.1.5, §3.7), knockout events (§3.2.2, §3.3.4),
  multi-stage / qualifying competitions, the formal all-play-all construct
  (§2.4.2), hybrid/Pachabo scoring (§3.1.6), and online/BBO specifics.

## Summary

| # | White Book | Topic | Status | Severity |
|---|-----------|-------|--------|----------|
| B1 | §3.1.1 | Teams-of-four IMP→VP discrete scale | OK | — |
| B2 | §3.1.2 | Triangular (10–0) VP scale | OK | — |
| B3 | §3.1.3 | Cross-IMP XIMPQ normaliser √(rc/2) | OK | — |
| B4 | §3.1.7 | Swiss pairs %→VP tables + borderline | OK | — |
| B5 | §3.3.2 | Pairs unplayable board (cancel / sub-field) | OK | — |
| B6 | §3.3.6 | Teams incorrect seating void (40%/60%) | OK | — |
| B7 | §3.3.7 | Teams removed board ±3 IMP indemnity | OK | — |
| B8 | §3.3.9 | Void match AVE+/AVE−/AVE half-split | OK | — |
| B9 | §3.5 / §3.5.2 | Swiss mismatch detection + VP adjustment (0.5-VP round-up) | OK | — |
| B10 | §4.1.1.1 | AVE+/AVE− "better than average" at MP | OK | — |
| B10b | §4.1.1.1 | AVE+/AVE− "better than average" at IMP/XIMP | OK | — |
| B11 | §4.1.1.4 | Weighted scores (convert-then-blend, 2dp) | OK | — |
| B12 | §4.2.3.2 | Neuberg's formula + application condition | OK | — |
| B13 | §4.2.3.3 | Small sub-fields (65/55, 70/50) | OK | — |
| B14 | §4.2.5 | All boards count equally / scale by boards | OK | — |
| B15 | §4.2.6.1 | No mid-calc rounding; halves away from average | OK | — |
| B16 | §4.2.6.3 | Cross-IMP total rounded to whole IMP | OK | — |
| B17 | §2.4.3–§2.4.7 | Withdrawals / late arrival | OK | — |
| D1 | §3.2 | Split-tie / tie-break ordering | WONT-IMPLEMENT | — |
| D2 | §4.2.4 / §4.2.6.2 | Butler datum (nearest 10) IMP pairs | WONT-IMPLEMENT | — |
| D3 | §3.5.3 | Mismatch in a match-point-scored Swiss event | WONT-IMPLEMENT | — |
| C1 | §4.1.1.4 | "Offenders must not gain" | TD-JUDGEMENT | — |
| C2 | §3.3.6.2 | ≥half / <half void decision | TD-JUDGEMENT | — |
| C3 | §3.3.10 | Wrong board number → AVE−/AVE− | TD-JUDGEMENT | — |

---

## Verified-correct (OK)

### B1 — Teams-of-four IMP→VP discrete scale — OK
**§3.1.1.** `src/scoring/swiss/imp-vp-table.ts` is ported verbatim from the EBU's
own VP generator (`vps.js`): golden-ratio decay constant `R`, the `imap` inverse
curve, `discrete` band construction (`blitz = 15·√boards`), and the `discreteCC`
concavity-correction pass. `impVpWinner` / `impVpSided` read the bands; the loser
takes `pool − winner`. This reproduces the published discrete tables rather than
rounding a continuous curve.

### B2 — Triangular / short-triangle 10–0 scale — OK
**§3.1.2 / §3.4.3.** The 10-VP pool is the same `imp-vp-table.ts` machinery with
the EBU "triangular" board indexing (`boardArg` uses `H/2`). Teams triples pick
the pool via `tripleVpPool` (10 SHORT / 20 LONG) in
`src/scoring/swiss/team-match.ts`.

### B3 — Cross-IMP XIMPQ normaliser — OK
**§3.1.3 / §4.2.6.3.** In `src/scoring/swiss/swiss-vp-round.ts`
(`buildXimpByBoard`) the per-board normaliser is `Math.sqrt((r * c) / 2)` with
`r` = results and `c = r − 1`, matching `XIMP / √(rc/2)` exactly. The round total
is rounded to a whole IMP (halves away from zero, `roundHalfAwayFromZero`) before
the VP lookup, per §4.2.6.3.

### B4 — Swiss pairs %→VP tables + borderline — OK
**§3.1.7.** `src/scoring/swiss/mp-vp-table.ts` holds the board-count-banded
threshold tables (full 20-VP and half 10-VP). The lookup is "not exceeding"
(`pct <= threshold` keeps the lower band) and the percentage is rounded to 2 dp
first, matching the published precision. Below 50% a pair mirrors
(`pool − winnerVp(100 − pct)`); because the winner side uses the nearer-average
(lower) band on an exact threshold, the mirrored side lands on its complement —
consistent with note (b) "the VP nearer to average is taken".

### B5 — Pairs unplayable board — OK
**§3.3.2.** A board played once in a form is cancelled and given an artificial
adjusted score (`cancel-board.handler.ts` → `A<ns>/<ew>`); a board played in two
forms becomes two sub-fields, which the §4.2.3 cross-board equalisation
(`equaliseMpBoards`) scores correctly by scaling each short group to the full
field.

### B6 — Teams incorrect seating void — OK
**§3.3.6.1.** `src/model/teams-match-void.ts`: `SEATING_STANDARD` → both teams
40% of the pool (8/20); `SEATING_TD` → both 60% (the TD-at-fault converse).
Board-a-match variants mirror this in board-won units.

### B7 — Teams removed board ±3 IMP — OK
**§3.3.7.** `src/model/teams-removed-board.ts`: `REMOVED_BOARD_IMPS = 3`, a fixed
±3 IMP swing per removed board by fault, consumed by `teamMatchBoardImps` as a
board that counts as played. (Documented limitation: `NEITHER_FAULT` +3/+3 and
`BOTH_FAULT` −3/−3 both net to a zero swing in the single IMP margin; the
per-side distinction is carried only by the whole-match void path. Minor, no
scope impact.)

### B8 — Void match AVE+/AVE−/AVE half-split — OK
**§3.3.9.** `voidSplitVp` awards AVE+/AVE− on `⌈N/2⌉` boards (±3 IMP each) and
AVE on the rest, reading each side's VP independently off the N-board scale, so
both-at-fault correctly gives both teams a below-average VP. The Swiss-pairs
analogue is `src/model/pairs-match-void.ts` (`VOIDP:<cause>` per-pair
AVE+/AVE−/AVE blend via `voidMpFractions` / `voidXimpPerComparison`).

### B9 — Swiss mismatch detection + VP adjustment — OK
**§3.5 / §3.5.2.** `detect-mismatch.ts` replays the deterministic draw on
corrected standings and flags a swap only when the opponents' current VPs differ
by **more than 5** (`MISMATCH_VP_THRESHOLD = 5`). `adjustMismatchVp` applies the
one-sided §3.5.2 formula with `base = pool/4` (5 on 20–0, 2.5 on the 10–0
triangular pool): HIGHER+NOT → `base + ¾·actual`; LOWER+OWN →
`actual − ¼·max(0, actual − base)`; the other two cases unchanged. The adjusted
VP is then rounded **up to the next 0.5 VP** ("in the competitor's favour",
§3.5.2, via `roundUpToHalf`), since the ¾/¼ formulas can land on a quarter-VP
(e.g. `5 + ¾·7 = 10.25 → 10.5`). Reproduces both worked examples (12-8 → 14,
13-7 → 11). The "several valid alternatives" exception and fault attribution are
left to the director (correctly — they are judgement calls). The match-point-
scored-Swiss variant (§3.5.3) is not applicable — see D3.

### B10 — AVE+/AVE− "better than average" at matchpoints — OK
**§4.1.1.1.** `src/scoring/traveller/pair/better-than-average.ts`: AVE+ =
`max(60%, pair's windowed average)`, AVE− = `min(40%, average)`, computed over
the pair's real boards in the window (the Swiss match's round, or the session
otherwise) and applied to the standings only (the per-board traveller keeps the
flat 60/40). Applied uniformly to every synthesised AVE award (sit-out,
withdrawal, late/handover credits), not just director rulings. (IMP/XIMP: see
B10b.)

### B10b — AVE+/AVE− "better than average" at IMP and Cross-IMP — OK
**§4.1.1.1.** The same principle on the IMP scale: a pair averaging +5 IMPs
given AVE+ keeps +5, not a flat +3 (the White Book example: +4 average → +4 for
AVE+). `src/scoring/traveller/pair/better-than-average-imp.ts`
(`applyBetterThanAverageImpBoards` / `applyBetterThanAverageXimpBoards`) uplifts
AVE+ to `max(+3, pair's windowed average IMP)` and AVE− to `min(−3, average)`,
over the pair's real played boards, standings only — mirroring the matchpoint
module. Wired at the board-pooled leaderboard seam
(`leaderboard-service.ts:scoreBoardsToOverall`) and the USEBIO export
(`generate-usebio.ts:computeOverallRanking`); the per-board traveller display
keeps the flat ±3. Note: the datum-less Butler IMP scale floors each side at 0,
so an AVE− downlift only bites on the signed Cross-IMP scale; AVE+ works on
both. (The Swiss Cross-IMP VP path handles an artificial award differently — the
row is dropped from the field rather than valued at a flat ±3 — so this uplift
does not apply there.)

### B11 — Weighted scores — OK
**§4.1.1.4 / §4.2.1.** `src/model/adjusted-score.ts` encodes `W<pct>*<contract>;…`
with weights 0 < w ≤ 100 at up to 2 decimal places summing to 100 (checked in
integer basis points, so 33.33/33.33/33.34 is accepted). `assigned.ts` converts
each component to matchpoints/IMPs/cross-IMPs **first** and then blends by
weight, per §4.1.1.4. The ≥5-component, 2-dp recommendation is met (components
are unbounded).

### B12 — Neuberg's formula + condition — OK
**§4.2.3.2.** `src/scoring/traveller/pair/neuberg-across-boards.ts`: Neuberg is
used unless the small-sub-field rule applies —
`useSmallSubField = (a === 2 || a === 3) && a*3 <= e`, i.e. Neuberg when
`A > 3` **or** `A > E/3`. The formula `((M+1)/A)·E − 1` is applied via the `E/A`
ratio in `neuberg()`. Full precision is kept through the calculation (the
"nearest 0.0001" rounding is subsumed by the single final per-board rounding,
B15).

### B13 — Small sub-fields — OK
**§4.2.3.3.** `smallSubFieldFraction = 60 + (singleMp − (A−1)/2)·10` (percent),
yielding top 65% / bottom 55% for a group of 2 and 70/60/50 for a group of 3,
with intermediate/tied results between — and summing to 120% (AVE+/AVE+) as the
note prescribes. Guarded by `A ∈ {2,3}` and `A ≤ E/3`.

### B14 — All boards count equally / scale by boards played — OK
**§4.2.5.** MP ranks on `totalMP / maxMP` (a percentage of available
matchpoints); IMP and cross-IMP rank on the **average** per board
(`value / boards`) with the §4.2.5 citation in
`src/scoring/overall/pair/{imp,x-imp}.ts`. Combined with the §4.2.3 equalisation
that lifts every board to a common top, all boards carry equal weight and a
contestant playing fewer boards is compared fairly.

### B15 — No mid-calculation rounding; halves away from average — OK
**§4.2.6.1.** `src/scoring/traveller/pair/round-mp-boards.ts`
(`roundHalfAwayFromAverage`, around `avg = max/2`) runs **last** in the pipeline —
after Neuberg equalisation and the better-than-average uplift, all of which run
at full precision. Only NS is rounded; EW is kept as `max − roundedNs` so the two
seats sum to the top, and the published total equals the sum of the shown board
scores.

### B16 — Cross-IMP total rounded to whole IMP — OK
**§4.2.6.3.** The XIMPQ round total is rounded to a whole IMP (halves away from
zero) in `swiss-vp-round.ts` before the VP-scale lookup, exactly as the text
requires so swings never fall in the gaps of the VP scale.

### B17 — Withdrawals / late or non-arrival — OK
**§2.4.3–§2.4.7.** `src/services/leaderboard-service.ts` (`withdrawalCreditBoards`)
plus `src/db/games/queries/ranking-exclusions.ts` (`resolveStandings`) implement:
withdrawal part-way through a session (§2.4.4) — opponent gets AVE+ after half,
score cancelled before half, split on boards actually played; the withdrawer's
own score (§2.4.5) — PENALISED gets `(40 − fine)%` capped at half the event,
REMOVE drops from the ranking (§2.4.9); the missing-contestant rule (§2.4.6) —
AVE− per unplayed board for pairs, the §3.3.9 void for Swiss teams
(`team-withdrawal.ts`); and late arrival (§2.4.7) — a latecomer retains standing
only if present for ≥ half the boards, empty half-table seats get AVE+/AVE−
cancelled if the pair never arrives, and a mid-session handover to a real pair is
supported. Strong, scope-complete coverage.

---

## Won't-implement (deliberate product decisions)

### D1 — Tied contestants share a rank; no split-tie procedure — WONT-IMPLEMENT

**White Book §3.2 (esp. §3.2.7).** When a tie *must* be broken — for the winner,
the last qualifying position, or an indivisible prize (§3.2.4) — there is a
defined order of tests. For two contestants (§3.2.7.1): (a) the result of the
head-to-head match/round (final method, then basic method); (b) number of
matches/rounds won in the final method (a draw = half a win, a short triangle =
half a match); (c) tie-break ("Swiss") points — the sum of each direct
opponent's final score; (d) the basic method over all boards in the stage; (e)
point-a-board count-back; (f) random ballot. §3.2.7.2/§3.2.7.3 give the
analogous order for three or more.

**Code.** The only ranking primitive is `rank` in
`src/scoring/overall/rank.ts`: it sorts on a **single numeric key**, groups
values within an epsilon, and gives tied contestants a **shared rank** with a
`tied: true` flag. There is no secondary ordering — no head-to-head, no
matches-won, no Swiss-points, no basic-method fallback, no point-a-board
count-back.

**Decision.** Shared-rank behaviour is **intentional** for this app. The Bridge
Box runs club sessions on a local network, not EBU-sponsored events with
trophies or qualifying places — the context §3.2.4 reserves tie-splitting for.
Genuinely tied contestants are shown as joint (e.g. "=1st") with the `tied`
flag, which is the correct and expected outcome for club play; a director who
must separate a tie for a club prize does so by the club's own convention
(§3.2.4 lets tied contestants share Master Points and cash/voucher prizes
anyway, and an event with no trophy leaves the tie unresolved by §3.2.4(a)).
Implementing the full §3.2.7 chain — which needs head-to-head results,
matches-won, Swiss points, and per-board point-a-board count-back all threaded
to the ranking seam, plus a director-triggered random ballot — is disproportionate
to the club use case and is not planned. This divergence is accepted.

### D2 — IMP pairs is datum-less; no Butler datum rounded to nearest 10 — WONT-IMPLEMENT

**White Book §4.2.4 / §4.2.6.2.** Butler/datum IMP pairs scoring computes a
datum for each board (the mean of the field's scores, with top/bottom optionally
discarded), **rounds the datum to the nearest 10** (exact 5s away from average),
and IMPs each result against it.

**Code.** The pairs `IMP` scoring type (`src/scoring/traveller/pair/imp.ts`,
`scoreIMP`) is **datum-less Butler**: each table's raw score is IMPed against a
notional zero (`computeImps(score)`), not against a field datum. No datum is
computed anywhere, so the "round the datum to the nearest 10" step does not
exist. The cross-IMP type (`XIMP`, `scoreXIMP`) sidesteps a datum entirely by
averaging pairwise IMPs.

**Decision.** The app deliberately offers cross-IMP (and a datum-less IMP)
rather than datum Butler for pairs. This divergence is accepted and will not be
implemented; the §4.2.6.2 datum-rounding rule is moot while no datum is computed.

### D3 — No mismatch handling for a match-point-scored Swiss event — WONT-IMPLEMENT

**White Book §3.5.3.** A Swiss event may be scored as **total match points**
(presented as a percentage) rather than converted to Victory Points; the
mismatch regulations then use ¼ of the match points available for a round as the
threshold (in place of 5 VP) and apply the one-sided adjustment in match-point
terms.

**Code.** The app does not offer a total-match-point Swiss final method: a Swiss
Pairs game with scoring type `MP` is **always** converted to per-round Victory
Points (`classifyEvent` → `swissVpMode: "MP"` → the §3.1.7 MP%→VP table). Swiss
mismatch detection and adjustment therefore work in VP throughout
(`detect-mismatch.ts`, `adjustMismatchVp`); there is deliberately no
match-point-terms variant.

**Decision.** Like datum Butler (D2), the total-match-point Swiss final method
is a scoring mode the app chose not to support — Swiss Pairs is VP-converted
here. The §3.5.3 match-point mismatch rule has no supported path to apply to, so
it is not planned. (The VP mismatch rule it mirrors is fully implemented — see
B9.)

## TD-judgement items (software supports, does not enforce)

### C1 — "Offenders must not gain" — TD-JUDGEMENT
**§4.1.1.4 (Law 12C1b).** A weighted ruling must not let the offending side gain;
the weighting leans to the non-offenders ("sympathetic weighting"). The model has
no concept of which side offended, and the director chooses the components and
weights. Automating a clamp would risk overriding a legitimate ruling. The
software's role is to calculate the ruling the director enters, which it does.

### C2 — ≥half / <half void decision — TD-JUDGEMENT
**§3.3.6.2 / §3.3.7.** Whether at least half a match was played correctly (so the
rest is averaged) versus the match being void is a director determination that
also depends on time available (§3.3.7(c)). The director selects the void cause
(`SEATING_*` vs `SHORT_*`); the mechanical consequence of each choice is scored
correctly (B6/B8). No automatic half-detection is required or desirable.

### C3 — Wrong board number → AVE−/AVE− — TD-JUDGEMENT
**§3.3.10.** Making a board unplayable by scoring against the wrong board number
is AVE−/AVE−. The director enters this as `A40/40`; there is no dedicated
automation (nor is one needed — it is a specific ruling).

---

## Scope exclusions (not audited)

- **§3.1.4, §3.1.5, §3.7** teams-of-eight-or-more (cross-IMP Tollemache, Garden
  Cities, modified IMP scale, teams-of-eight fouled-board formulae).
- **§3.1.6** hybrid-IMP / Pachabo scoring.
- **§3.2.2, §3.3.4** knockout events (extra-board tie splitting, replay rules).
- **§2.4.2** the formal all-play-all withdrawal construct.
- Multi-stage / qualifying competitions and carry-forward (§3.8).
- Online / BBO specifics (§1.1.2, §2.3.7–§2.3.9).
