# Swiss Pairs "2 half matches" — design

Status: **draft for review.** Design/requirements document, not implemented yet.
It adds an odd-field handling to Swiss Pairs where, instead of a full bye, three
pairs are resolved by **two half matches** within one round.

Companion document: Swiss **Teams** uses the triple/triangle terminology (short
& long triples) — a different enough mechanic that it is its own feature. See
`docs/swiss-teams-triples-design.md`. This document is **Pairs only**, and the
words "triple"/"triangle" are **not** used for pairs.

## 1. Background: what "2 half matches" is (pairs)

When a Swiss **Pairs** event has an **odd number of pairs**, one pair would
otherwise sit out the whole round (a *bye*). The **2 half matches** option
avoids a full sit-out: **three pairs** are involved, and the round is split into
two halves so that each of the two "unlucky" pairs plays only half the round
rather than sitting out all of it.

This is the EBU Swiss Pairs structure
(https://forums.ebu.co.uk/discussion/1361/triangles-in-swiss-pairs):

- One pair — the **anchor** (the "lucky" N/S pair) — plays the **full round**,
  facing a **different opponent in each half**.
- The other **two pairs** each play **one half** against the anchor, and sit out
  the **other half** (compensated — see §4).
- The two half-playing pairs **never meet each other** (only two halves exist, so
  only two of the three pairings are played — both involve the anchor).

Note there is **no "long" variant for pairs.** A two-round version would have
each non-anchor pair sitting out a whole round, which is identical to just giving
byes — so it adds nothing. Pairs have **BYE** and **2 half matches** only.
(Teams do have a long triple because a team's two pairs make a two-round
rotation meaningful — see the teams document.)

## 2. What exists today

Swiss Pairs has **no odd-field option beyond a single bye**:

- `swissSpecSchema` (`src/model/selected-movement.ts`) has `tables`, `rounds`,
  `boardsPerRound` and **no odd handling** at all.
- The draw (`drawSwissRound` / `chooseSitOut` in
  `src/movement/swiss/swiss-pairing.ts`) always seats full tables + one sit-out
  pair; the director can reassign which pair takes the bye (`reassignBye`).
- The start validator (`src/model/start-validator.ts`) allows **at most one
  sit-out per section**.
- Round board range: `swissRoundBoardRange(roundNumber, boardsPerRound)`
  (`src/services/materialize-swiss-round.ts`) — round R plays boards
  `(R-1)*bpr+1 .. R*bpr`, every table the same set.
- There is **no team framing** in the pairs traveller.

So "2 half matches" is net-new for pairs (nothing to replace).

## 3. Director configuration

The director sets **how many rounds** the event has, and — at setup, as part of
the movement info — a **per-round schedule** of how the odd pair is handled each
round. Fixed up front (not chosen live).

**Per-round schedule.** One entry per round; each round is either a **BYE** or a
**2 half matches** round. There is no two-round variant, so every entry is
exactly one round.

Proposed spec shape on `swissSpecSchema`:

```
oddHandling: "BYE" | "HALF_MATCHES"
// when "HALF_MATCHES": one entry per round
oddRoundPlan: ("BYE" | "HALF_MATCHES")[]   // length === rounds
```

Example (7 rounds): `["BYE","HALF_MATCHES","HALF_MATCHES","BYE","HALF_MATCHES",
"BYE","HALF_MATCHES"]`.

Only meaningful when the pair count is odd; an even field ignores the plan. A new
Swiss Pairs setup dialog (mirroring `SwissTeamsSetupDialog`) gains, when the
field is odd, a per-round control to build this plan.

## 4. Board mathematics & scoring

- **Board split.** The round's `boardsPerRound` is split into **two halves**,
  odd counts rounding **down** to the nearest even (a 7-board round → 3 + 3, one
  board discarded for this round's half-match group). The anchor plays both
  halves (full even board set); each non-anchor pair plays one half. The rest of
  the field plays the round normally (full `boardsPerRound`).
- **Board rule.** A pair never plays the same board twice: the two halves use
  **different** board subsets, and the anchor plays each board once across the
  two halves.
- **Board-row encoding (RESOLVED).** A half-match round is materialized as two
  ordinary head-to-head matches plus compensation markers — no fraction is
  stored on rows (the scorer recomputes it):
  - **Half 1:** real rows `ns = anchor, ew = halfOneOpponent` on board subset S1.
  - **Half 2:** real rows `ns = anchor, ew = halfTwoOpponent` on board subset S2.
    (Both halves sit at the **anchor's table**; the two non-anchors swap in/out.)
  - **Compensation:** rows with the new board status **`HALF_AVERAGE`**,
    `ns = the non-anchor, ew = a phantom`, on the boards that non-anchor missed
    (`halfOneOpponent` missed S2; `halfTwoOpponent` missed S1). These are never
    played/submittable; the scorer recomputes the AVE+/AVE split across them.
  - The scorer groups a round's rows by **(round, table, opponent)** so the
    anchor's two halves are two separate half-matches (each → VP/10, summed per
    round for the anchor), and distinguishes a `HALF_AVERAGE` block (compensated
    half) from a `SIT_OUT` row (a full bye).
- **Scoring — two halves, each on a 10-VP scale, summed to the round's /20
  (RESOLVED).** A half-match round is scored as **two independent half-matches**.
  Each half produces a half-match result (a matchpoint percentage in MP mode, a
  cross-IMP total in Butler/cross-IMP mode), that result is converted to VP on a
  **10-VP scale**, and the pair's two halves are **added** to give its result out
  of **20** for the round — exactly as a normal round totals 20. Concretely:
  - **Anchor** (plays both halves, vs a different opponent each half): half-1
    result → VP/10, half-2 result → VP/10, summed → /20. Both halves are real.
  - **Non-anchor** (plays one half, misses the other): the **played** half's real
    result → VP/10; the **unplayed** half's **compensation** result → VP/10;
    summed → /20.
  - The **played** half is scored **against the whole section's field**, exactly
    like a normal round, but **restricted to that half's board subset** (Q-A
    resolved — Option A). It is NOT an isolated head-to-head between the two
    pairs at the table: the half's boards are also played at every other table
    that round, so the field for those boards is the whole room. The half's
    field percentage (MP) / cross-IMP total (Butler) → VP on a 10-VP scale.

- **Compensation for the unplayed half (RESOLVED, both scoring modes).** The
  non-anchor's unplayed half is **not** a flat average-plus. Its boards are split:
  **AVE+ on half of the unplayed-half's boards (rounded up), AVE on the rest.**
  The two modes express AVE+/AVE differently, then convert the half to VP/10:
  - **Matchpoints:** AVE+ = **60%** of the board top (`SIT_OUT_MP_FRACTION`),
    AVE = **50%**. The blended per-board figures give the unplayed half's
    percentage → VP/10.
  - **Cross-IMP (Butler):** AVE+ = **+2 IMP per comparison**, AVE = **0 IMP per
    comparison** (dead average; AVE− would be −2 but is not used here). The
    blended per-board cross-IMPs give the unplayed half's cross-IMP total →
    VP/10.

  Example — an 8-board round → two 4-board halves; a non-anchor plays 4 for real
  and its unplayed half of 4 is AVE+ on `ceil(4/2) = 2` boards and AVE on 2.
  (A 6-board round → 3+3; the unplayed half of 3 is AVE+ on `ceil(3/2) = 2`,
  AVE on 1.)

Note this differs from a plain bye: a **bye** credits a flat AVE+ across the
whole missed round; a **half-match** non-anchor gets a real played half plus the
AVE+/AVE-blended unplayed half, each converted to its own VP/10.

## 5. Seating & movement

### Pairing is computed separately from table placement (design constraint)

**Who plays whom is worked out independently of which table a match sits at.**
The draw is two phases, and this feature keeps that separation (it already
exists in the current Swiss Pairs engine — `pairUp` decides opponents, then
`seatMatches` places them):

1. **Pairing phase** — from standings + history, decide the opponent assignments
   for the round: the ordinary matches **and** the three-pair half-match group
   (the anchor and the two non-anchors it faces in each half). This phase knows
   nothing about tables or stationary pairs — it is purely "who plays whom".
2. **Seating phase** — place those assignments at physical tables and choose
   directions. **Stationary pairs only affect this phase**: a stationary pair
   keeps its home table, and whoever it is drawn against is sent to travel to it.

So the half-match group's opponent assignments are the **same regardless of
whether a stationary pair is involved**; the stationary pair only changes *where*
the match is seated and *who travels*. In particular, when the anchor is a
stationary pair (forced by §5's anchor rule), the two non-anchors travel to the
stationary pair's table to take their half each — the pairing is unchanged, only
the seating reflects the stationary home. Keeping the two phases separate means
the assignments are correct whether or not a stationary pair is present.

The three pairs are the anchor plus two others. Within one round:

- **Half 1:** anchor vs pair X (first board subset).
- **Half 2:** anchor vs pair Y (second board subset).

**Movement convention (Q11 resolved): the non-anchors swap in and out.** The
anchor stays at one table for the whole round; at the midpoint pair X leaves and
pair Y comes in to play the anchor for half 2. (We do **not** move the anchor to
a phantom second table — the two non-anchors rotate through the anchor's table.)
Each half's board subset is set up at that table for its half.

**Stationary pairs & anchor choice.** If one of the three is a stationary pair it
must be the **anchor** (it can't move, and the anchor is the one that stays all
round). If none of the three is stationary, the anchor is chosen deterministically
(proposed: by standing / lowest id — to be fixed in implementation). The two
non-anchors are the pairs that swap in and out.

**Timer: do NOT touch the timer.** The midpoint switch is a local instruction to
the three pairs only; the room-wide timer/phases are unaffected.

### Telling the players where to go (round-info / schedule) — REQUIRED

The three pairs must be **told what to do at the midpoint** on their own
devices. Today the player "where to go" surface is the per-seat **schedule**
(`getSchedule` → `/api/games/{gameId}/schedule/{seat}` → `AssignmentContext` →
the play / round-info screen). It is modelled as **one entry per round** — a
single `tableNumber`, one `boards` list, one set of opponents — which a
half-match round breaks:

- A **non-anchor** plays only one half of the round. Its round entry must show
  its table (the anchor's table), the half's board subset, its opponent (the
  anchor), and **when it plays** — e.g. "you play the **first half** (boards
  1–3), then you're done" or "you come in for the **second half** (boards 4–6)".
- The **anchor** plays **two** half-matches in the one round — same table, a
  different opponent each half, two board subsets. Its round entry must show
  **both** halves and the opponent change at the midpoint ("boards 1–3 vs X,
  then boards 4–6 vs Y").
- The instruction must be explicit about the **switch**: after the first half's
  boards, the first non-anchor leaves and the second comes in (per the Q11
  convention). This is a schedule/round-info change, **not** a timer change.

So `getSchedule` (and the round-info screen it feeds) must represent a
half-match round as **a round with two half-segments** rather than a single
`{tableNumber, boards, opponents}`. See the task list for the concrete step.

## 6. Traveller, leaderboard, USEBIO

- **Traveller:** pairs have no team/match framing today. A 2-half-matches round
  needs a presentation showing the anchor's two half-matches (and the phantom/
  second-table arrangement), with each physical line still selectable for a
  director override. New work for the pairs traveller.
- **Leaderboard:** must show the split AVE+/AVE compensation for the
  half-sitting pairs (§4) and the anchor's combined full-round result, without
  double-counting boards.
- **USEBIO:** each real half match is emitted as its own `MATCH` element scored
  **cross-IMP vs the field** over that half's boards on a **10-VP scale** (so the
  export agrees with the leaderboard, not a separate head-to-head figure). Within
  a real half the two pairs played the identical boards against the identical
  field, so `NS_SCORE + EW_SCORE = 10` holds. The anchor emits **two** MATCH
  elements (vs A, vs B); A and B emit **one** each (their shared anchor half). The
  sat-out half's AVE+/AVE compensation has no opponent, so it is **not** a MATCH —
  it is folded into A's / B's `TOTAL_SCORE` only. Sequenced **after** the Step 3
  / Step 5 scorer exists (it reuses the per-half cross-IMP VP + compensation
  credit), not in isolation (Q8).

## 7. Scope summary (pairs)

1. Spec/schema — `oddHandling: "BYE" | "HALF_MATCHES"` + `oddRoundPlan`
   (`"BYE" | "HALF_MATCHES"`) on `swissSpecSchema`.
2. Setup UI — a Swiss Pairs setup dialog with an odd-field per-round plan
   builder (new; mirrors `SwissTeamsSetupDialog`).
3. Draw engine — keep the two-phase split (§5): a **pairing phase** that decides
   opponents (ordinary matches + the three-pair half-match group's anchor and its
   two half opponents) independent of tables/stationary, then a **seating phase**
   that places matches at tables and brings opponents to a stationary pair's
   table where needed. Fairness: a pair hasn't been in a half-match / bye
   recently; pick the anchor (`swiss-pairing.ts`).
4. Board maths + materialization — half-round split; the anchor's two board
   subsets; the two non-anchors swapping through the anchor's table (no phantom
   second table) (`materialize-swiss-round.ts`).
5. Scoring — two half-matches per round, each half's result → VP/10, summed →
   /20 (§4); the non-anchor's unplayed half uses the AVE+/AVE split (MP: 60%/50%;
   cross-IMP: +2/0 IMP per comparison). On the Swiss Pairs VP path.
6. Start validator — allow the 3-pair half-match group (currently "at most one
   sit-out per section").
7. Player schedule / round-info — tell each of the three pairs where to go and
   when to switch at the midpoint (`getSchedule` represents a half-match round as
   two half-segments; the round-info screen renders the switch). No timer change.
8. Traveller / leaderboard / USEBIO — render and export a 2-half-matches round.

## 8. Open questions

Resolved:

- Per-round schedule, one entry per round (no long variant for pairs).
- Never replay a board (two half subsets).
- **Q5b** ✅ The anchor plays the **full round**, half each against **two
  different opponents**; the two non-anchors each play one half.
- **Scoring model** ✅ Two half-matches per round, each percentage → VP on a
  **10-VP scale**, summed → **/20** for the round.
- **Unplayed-half compensation** ✅ AVE+ on half the unplayed-half's boards
  (rounded up) + AVE on the rest, as that half's percentage (not a flat
  average-plus).
- Don't touch the timer; declared rounds = playing periods.

Still open:

- **Q-A** ✅ (Option A) The played half is matchpointed/cross-IMPed against the
  **whole section's field** restricted to **that half's board subset** (NOT an
  isolated two-pair head-to-head — the half's boards are played across the room,
  so the field is the whole room), then converted to VP on a 10-VP scale. This
  keeps the half-match consistent with how every normal Swiss Pairs round and the
  USEBIO export score, and reuses the existing field-pooled scorers.
- **Q-B** ✅ Both scoring modes are supported. MP mode: AVE+ = 60%, AVE = 50%.
  Cross-IMP (Butler) mode: AVE+ = +2 IMP per comparison, AVE = 0 IMP per
  comparison. Each half converts to VP/10 (WBF scale on the half's board count
  for the IMP path).
- **Q11** ✅ The two **non-anchors swap in and out** through the anchor's table
  (no phantom second table). Anchor choice: a stationary pair must be the anchor;
  otherwise deterministic (proposed by standing / lowest id — fix in
  implementation).
- **Q8** ✅ USEBIO mapping. Each real half match → its own `MATCH` scored
  **cross-IMP vs the field** on a **10-VP scale** (agrees with the leaderboard;
  within a real half the two pairs share the identical boards/field so
  `NS_SCORE + EW_SCORE = 10`). Anchor emits two MATCH elements (vs A, vs B); A and
  B emit one each. The sat-out half's AVE+/AVE compensation is **not** a MATCH
  (no opponent) — it is folded into A's / B's `TOTAL_SCORE` only. Built **after**
  the half-match scorer (Step 3/5), reusing its per-half VP + compensation credit.

## 9. Implementation task list

Build **engine-first** (pure, unit-tested domain logic before any I/O or UI),
mirroring how Swiss Teams was built. Each step should land green (unit + tsc +
lint) before the next. No step changes the timer. MP and cross-IMP modes are
both in scope; USEBIO (Q8) is a deferred follow-up.

Terminology in code: use **"half match"** / **`halfMatches`** for pairs — never
"triple"/"triangle" (that is teams-only).

**Storybook (repo convention — applies to every UI change below).** Every new or
changed presentational component gets a co-located `*.stories.tsx` with stories
covering the half-match states **and** the unchanged ordinary/bye states (so the
story set is a visual regression guard). a11y is enforced globally
(`.storybook/preview.tsx` is in `error` mode), so each story must pass the axe
check. If half-match markup would otherwise live inline in a page/route,
**extract a presentational child** so it can be storied (per the storybook
coverage audit's "extract `*Page`/child" convention). The storybook Vitest
project (`npx vitest --project storybook`) must stay green. The steps below name
the specific stories expected.

### Step 1 — Spec/schema + validation (`src/model/selected-movement.ts`)

- Add to `swissSpecSchema`: `oddHandling: z.enum(["BYE","HALF_MATCHES"]).optional()`
  (default `"BYE"`) and `oddRoundPlan: z.array(z.enum(["BYE","HALF_MATCHES"])).optional()`.
- Validation (pure, unit-tested): when `oddHandling === "HALF_MATCHES"`,
  `oddRoundPlan.length === rounds`; only meaningful for an odd pair count.
- Update `selectedMovementsEqual` to compare the new fields; round-trip tests in
  `selected-movement.test.ts`.
- Acceptance: schema parses/round-trips; equality covers the new fields.

### Step 2 — Pairing phase: three-pair group + half pairings (`src/movement/swiss/swiss-pairing.ts`)

- Pure functions, no tables/stationary knowledge (the "who plays whom" phase):
  - choose the three pairs for a half-match round — a fairness rule mirroring
    `chooseSitOut` (prefer pairs that haven't recently had a half-match **or** a
    bye); surface the group as stable pair ids.
  - choose the **anchor** within the group (deterministic: a group member that
    is stationary must anchor — but note stationary is applied in seating, so at
    this phase expose the anchor choice as "by standing / lowest id" and let the
    caller override when a stationary pair is in the group).
  - produce the two half pairings: `anchor vs X` (half 1) and `anchor vs Y`
    (half 2), as abstract `Match`-like objects — **no table/direction**.
- Extend `SwissDrawInput` with the per-round plan entry (BYE vs HALF_MATCHES) and
  a `hadHalfMatch` history set (analogous to `hadBye`).
- Acceptance: given standings + history + a HALF_MATCHES round, returns the three
  pair ids, the anchor, and the two half pairings; identical regardless of
  stationary pairs.

### Step 3 — Scoring: half-match VP + unplayed-half compensation (`src/scoring/swiss/`)

- Pure functions:
  - score one half-match to **VP on a 10-VP scale** from the half's boards, in
    both modes (MP → percentage → VP/10; cross-IMP → cross-IMP total → VP/10 via
    the WBF scale on the half's board count). Reuse existing MP/cross-IMP board
    scorers + `calculateWbfVP` / the MP-VP path.
  - compute the **unplayed-half compensation** result: AVE+ on `ceil(n/2)` of the
    unplayed half's `n` boards, AVE on the rest. MP: AVE+ = 60%
    (`SIT_OUT_MP_FRACTION`), AVE = 50%. Cross-IMP: AVE+ = +2 IMP/comparison,
    AVE = 0 IMP/comparison. Convert to VP/10.
  - combine a pair's two halves (played and/or compensated) → the round's /20.
- Wire into the Swiss Pairs overall (`swiss-mp-vp-overall.ts` /
  `swiss-ximp-vp-overall.ts`): a HALF_MATCHES round credits the anchor two real
  halves, each non-anchor one real + one compensated half; a BYE round is
  unchanged.
- Acceptance: worked examples from §4 (8-board → 4+4, 6-board → 3+3) produce the
  expected /20 for anchor and non-anchors in both modes; a bye round still uses
  the existing flat credit.

**Done (what landed).** A shared pure module `swiss-half-match.ts` owns the
*structural* half-match logic (so neither scorer duplicates it): `segmentsForPair`
splits a pair's round rows into half-segments keyed by opponent (every
`HALF_AVERAGE` row collapsing into one compensation segment); `isHalfMatchRound`
distinguishes a half-match round (two segments, or any compensation segment) from
an ordinary one (a single real segment); `compensationSplit`/
`compensationMpFractions`/`compensationXimpPerComparison` express the AVE+ on
`ceil(n/2)` / AVE on the rest split; and `mpHalfVp`/`ximpHalfVp` convert a half to
VP on the 10-VP half-scale (literally half of the existing 20-VP independent-MP
and WBF conversions, so two halves sum back onto the familiar 20-VP round scale).
Both `calculateSwissMpVpOverall` and `calculateSwissXimpVpOverall` now accumulate
per `(pair, board)`, then per pair either take the ordinary single-segment path
(unchanged 20-VP conversion) or sum each half's VP/10. The per-board field
scoring is **unchanged** (Option A — a half is scored against the whole section's
field restricted to its board subset), so all 112 pre-existing scorer tests still
pass. `HALF_AVERAGE` rows reach the scorers untouched via
`leaderboard-service.scoreSwissVp` (verified), so no service wiring change was
needed. New unit tests: `swiss-half-match.test.ts` (8) + half-match blocks in
each scorer's test (MP 10 total, XIMP 11 total).

### Step 4 — Board maths + materialization (`src/services/materialize-swiss-round.ts`)

- Split a HALF_MATCHES round's `boardsPerRound` into two halves (odd → round
  down, discard one). Allocate the two halves distinct board subsets so no pair
  replays a board.
- Materialize the group: the anchor's table hosts both halves (its two board
  subsets); the two non-anchors each occupy one half. Seating phase honours a
  stationary anchor — opponents travel to the stationary pair's home table (keep
  the `pairUp` → `seatMatches` separation from §5). No phantom second table.
- Record enough on the board rows to reconstruct "this was a half-match round,
  this pair's unplayed half" for the scorer and history (mirror how SIT_OUT rows
  encode a bye today).
- Acceptance (int test): a materialized HALF_MATCHES round has the right board
  rows for anchor (both halves) and non-anchors (one half each); re-materialize
  is idempotent; `hadHalfMatch` history is recoverable.

**Done (what landed).** `swissHalfMatchBoardSplit(round, boardsPerRound)` splits
the round's range into two equal halves, rounding an odd count **down** (the
final board is dropped for the group) and returning `null` when there is less
than one board per half (caller falls back to a bye).
`swissHalfMatchToMaterializable(tables, round, boardsPerRound, group, seat,
firstFreeCompensationTable)` emits the group's `MaterializableTable[]`: the
anchor's one table carries **two** round entries (both halves, distinct board
subsets, distinct opponents — the non-anchors swap in/out, no phantom second
table), and each non-anchor gets a `HALF_AVERAGE` compensation block
(`ns = non-anchor`, `ew = PHANTOM`) on the half it missed (`halfOneOpponent`
played S1 → compensated S2; `halfTwoOpponent` → compensated S1), parked on table
numbers above every played/sit-out table. The anchor's fixed seat
(`SwissHalfMatchSeat { tableNumber, anchorDirection }`) comes from the seating
layer so a stationary anchor keeps its home seat; the opponent takes the
opposite seat each half. `swissRoundToMaterializable` / `materializeSwissRound`
take an **optional** `SwissHalfMatchMaterialization { group, seat }` (default
`null` → unchanged for ordinary/bye rounds); when present the group's three
pairs must NOT also be in `seating`. `MaterializableRound` gained a
`halfAverage?: boolean` flag → status `HALF_AVERAGE` in `buildSectionRows`, which
also now (a) skips assignments for `halfAverage` phantom blocks and (b) dedupes
round-1 assignment ids so the anchor's two half entries seed its seat once (a
no-op for every other movement). **Verified**: the materialized rows round-trip
through `buildSectionRows` → the Step-3 scorer's `segmentsForPair` to exactly
the expected grouping (anchor = two real segments; each non-anchor = one real +
one compensation), proving Step 4 feeds Step 3. Unit tests added to
`materialize-swiss-round.test.ts` (19 total in file). The seating layer that
actually *chooses* the anchor seat and threads this through the draw is Step 6;
Step 4 is the pure materialization primitive it will call.

### Step 5 — Start validator (`src/model/start-validator.ts`)

- Allow an odd Swiss Pairs field when `oddHandling` is set (today it caps at one
  sit-out). For a round-1 HALF_MATCHES plan entry, permit the three-pair group.
- Acceptance: an odd field with a valid plan starts; an odd field with no odd
  handling still reports the existing problem.

**Done (what landed).** Swiss Pairs now resolves its own start through
`resolveSwissPairsStart` (dispatched before the generic sit-out path in
`resolveSectionStart`, mirroring `resolveSwissTeamsStart`). The generic
`validateStart` already permits the single empty seat of an odd field, so the
odd field itself was never blocked; what's new is a group-size guard: when the
field is odd, `oddHandling === "HALF_MATCHES"`, and round 1's plan entry is
`HALF_MATCHES`, the field must have **≥ 2 tables** (three pairs) to form a group,
else the new `HALF_MATCH_FIELD_TOO_SMALL` problem blocks the start. An even
field, a BYE event, or a round-1 BYE plan entry all fall through to the ordinary
single-sit-out path unchanged (the dead SWISS branch of `applySitOut` was
removed — Swiss owns its path now). Unit tests added to
`start-game-service.test.ts` (odd HALF_MATCHES ≥2 tables starts; 1-table field
blocked; round-1 BYE plan still a bye; even field ignores the plan).

**Deferred to Step 6 (round-1 half-match materialization).** Director choice
allows a `HALF_MATCHES` round 1 (any round can be bye or half-match). The *gate*
is in place, but round 1 is still **materialized as a bye** for now:
materializing a round-1 half-match group reuses the same group-selection +
anchor-seat + `swissHalfMatchToMaterializable` machinery the live draw uses, so
it is built together with the draw/seating threading in Step 6 rather than
duplicated in the start pipeline. Until then a round-1 `HALF_MATCHES` plan entry
starts (correctly gated) but round 1 plays as a bye.

### Step 6 — Draw service + preview/commit (`src/services/draw-swiss-round-service.ts`, sockets)

- Build the shared "resolve a half-match round" helper (choose the group via
  `chooseHalfMatchGroup`, pick the anchor + its seat honouring a stationary
  anchor via `reanchorHalfMatchGroup`, seat the rest, materialize via
  `swissHalfMatchToMaterializable`), and use it for BOTH the live draw (rounds
  2+) AND round 1 at start (replacing the temporary round-1 bye stand-in from
  Step 5 when the round-1 plan entry is `HALF_MATCHES`).
- Thread the per-round plan into `resolveDrawContext` / `previewNextSwissRound` /
  `commitNextSwissRound` so a HALF_MATCHES round previews the group + halves and
  commits the exact shown arrangement (reuse the existing preview→edit→commit
  split; director may still swap/reassign within the rules).
- Acceptance (handler/service tests): preview returns the half-match layout +
  names; commit materializes it; a round-1 HALF_MATCHES plan materializes the
  group (not a bye); rejects a structurally invalid group.

**Done (what landed).**
- **Engine (`swiss-pairing.ts`):** `SwissDrawInput` gained `oddHandling?:
  "BYE"|"HALF_MATCHES"` (default BYE); `SwissDrawResult` gained `halfMatch:
  SwissHalfMatchSeating | null` ({group, anchorTable, anchorDirection}). When the
  field is odd and `oddHandling === "HALF_MATCHES"` (≥3 pairs), `drawSwissRound`
  calls a new `drawHalfMatchRound`: choose the group (`chooseHalfMatchGroup`),
  re-anchor onto a stationary member if any (`reanchorHalfMatchGroup`), pair+seat
  the rest on the other tables, seat the anchor last (stationary home, else the
  lowest free table in its direction-balancing seat). The group's three pairs are
  excluded from `seating` and `sitOutPairId` is null.
- **Odd-field parity fix (`rankedStandings`):** the live draw previously padded
  the field to an even `2*tables` (it appended the phantom position's id), so the
  engine's odd branch never fired for a real odd field — a latent gap affecting
  the *existing* bye draw too. `rankedStandings` now restricts the field to the
  SEATED pairs via a new `seatedPairIdsForSection` (reads the `assignments`
  table — authoritative, no player rows needed), so an odd field yields an odd
  `order` (`2*tables - 1`) and the engine's bye/half-match handling fires.
- **History (`swiss-board-history.ts`):** `SwissBoardHistory.hadHalfMatch` added
  — a non-anchor recovered from its `HALF_AVERAGE` row, the anchor from facing
  two DIFFERENT opponents at one table in a round.
- **Service/transport/UI:** `PreviewSwissResult` / `SwissPreviewAck` / the socket
  preview-ack + commit payload (Zod `halfMatchSchema`, optional, default null) /
  `NamedSeating` (new `NamedHalfMatch`) / `resolveSwissSeatingNames` all carry the
  half-match through; `commitNextSwissRound` validates the group+seating cover
  the real field and materializes via `materializeSwissRound(..., halfMatch)`.
  `SwissDrawPreview` renders the group **read-only** (not director-editable this
  step) + story `WithHalfMatch`; the structural-error OK-disable is suppressed
  for a half-match round (its three pairs aren't in `seating`).
- **Round-1 at start (`start-game-service.ts`):** `resolveSwissPairsStart` now
  materializes a round-1 half-match (replacing the Step-5 bye stand-in) via
  `resolveRoundOneHalfMatch` — positional field (real seated pairs, phantom
  excluded) → `drawSwissRound` (HALF_MATCHES) → `swissRoundToMaterializable`.
- **Verified:** full unit suite 3625 pass (incl. the draw int test); tsc + lint
  clean. The half-match group is NOT yet director-editable in the preview (swap
  within the group) — a deliberate scope line; the ordinary tables remain
  editable as today.

### Step 7 — Player schedule / round-info: tell players where to go (`src/services/schedule-service.ts` + round-info screen)

- `getSchedule` currently emits **one entry per round** (`{tableNumber, boards,
  players, ...}`). Extend a round entry to represent a **half-match round as two
  half-segments** so each of the three pairs is told what to do:
  - **anchor:** one round, same table, two segments — boards subset 1 vs opponent
    X, then boards subset 2 vs opponent Y (the midpoint opponent change).
  - **non-anchor:** one round, the anchor's table, a **single** segment — its half
    (first or second), its board subset, opponent = the anchor — plus a clear
    "you play the first/second half" marker so it knows when to arrive/leave.
- Round-info / play screen (the `AssignmentContext` consumer): render the
  segment(s) and an explicit **switch instruction** ("after boards 1–3, Pair Y
  comes in"). No timer involvement — this is purely informational, driven by the
  schedule.
- Keep ordinary and bye rounds rendering exactly as today (single segment).
- **Storybook:** if the round-info render is a presentational component, give it
  a co-located `*.stories.tsx` with stories for the **anchor** (two segments,
  midpoint switch), a **non-anchor first half**, a **non-anchor second half**,
  and (regression) an ordinary single-segment round. If the markup lives inline
  in a page/route, extract a presentational child so it can be storied (per the
  repo's "extract `*Page` child" convention). Stories must pass the enforced
  a11y check.
- Acceptance: `schedule-service` unit tests for a half-match round (anchor two
  segments; each non-anchor one half with the correct marker); the round-info
  stories above render and pass a11y.

**Done (what landed).**
- **`schedule-service.ts`:** `assembleRounds` reworked to keep ALL of a pair's
  rows per round (not one ns/ew), then `assembleRound` + `detectHalfMatch`
  classify the pair's role. `HALF_AVERAGE` rows are excluded from a pair's
  playable `boards`/`boardStatuses` (so a non-anchor isn't told to play its
  compensated half, and ContractWizard is unaffected). A new `halfMatch` field
  (`ScheduleHalfMatch { role: "anchor"|"firstHalf"|"secondHalf"; segments }`) is
  added to the round: the **anchor** (two distinct opponents at one table) gets
  two segments ordered by board subset; a **non-anchor** (has a `HALF_AVERAGE`
  row) gets one segment, `firstHalf`/`secondHalf` decided by whether its played
  boards precede its compensated boards. The anchor keeps its full board set
  (it plays all boards) so result entry is unchanged.
- **Client types (`play-state-machine.ts`):** `RoundSchedule` gained
  `halfMatch?: RoundHalfMatch` (+ `RoundHalfMatchSegment`, `SeatPlayers`), using
  the client `SeatPlayer` — structurally compatible with the server shape over
  the JSON boundary, so the client component never imports the `server-only`
  schedule module.
- **Round-info screen:** `RoundInfo` renders the half-match view when
  `halfMatch` is present — the anchor sees both halves + an explicit
  midpoint-switch instruction; a non-anchor sees only its half plus an
  arrive/leave note. `RoundInfoPage` + `PlayStateRouter` thread `round.halfMatch`
  through. Ordinary and bye rounds render exactly as before.
- **Stories + tests:** `RoundInfo.stories.tsx` (anchor / first-half / second-half
  + the existing ordinary stories) and a `RoundInfoPage` anchor story (a11y
  clean); `RoundInfo.test.tsx` (3 new) and `schedule-service.test.ts` (3 new:
  anchor two segments, first-half non-anchor excludes compensated boards,
  second-half marker).
- **Verified:** full unit suite 3631 pass; the RoundInfo/RoundInfoPage storybook
  tests pass; tsc + lint clean. No timer involvement — the switch is purely a
  schedule/round-info instruction.

### Step 8 — Setup UI (`SwissPairsSetupDialog` — new, mirrors `SwissTeamsSetupDialog`)

- Swiss Pairs currently has `SwissSetupDialog`-style setup; add an odd-field
  per-round plan builder (BYE vs HALF_MATCHES per round) shown only when the
  field is odd. Store on `swissSpecSchema`.
- **Storybook:** co-located `SwissPairsSetupDialog.stories.tsx` with stories for
  an **even field** (no odd-field control), an **odd field** (per-round plan
  builder visible, default plan), and a **plan with a HALF_MATCHES round
  selected**. Pattern-match the existing `SwissTeamsSetupDialog` story if one
  exists; a11y clean.
- Acceptance: unit + the stories above; a11y clean.

**Done (what landed) + a design note.** Extended the existing
`SwissSetupDialog` (no new component — the Swiss Pairs setup already had a
dialog). It gains a single top-level choice "If you have an odd number of pairs,
how should each round handle the odd pair?" → **Bye** (default) or **2 half
matches**; choosing the latter reveals a per-round plan builder
(`data-testid="odd-round-plan"`) listing every round with a Bye / Half matches
toggle, defaulting each round to a half match. The plan stays length-synced to
the Rounds stepper (`changeRounds` pads with HALF_MATCHES / truncates). On
confirm: all-bye handling emits a minimal spec (`{tables, rounds, boardsPerRound}`
— no plan); half-matches emits `oddHandling: "HALF_MATCHES"` + a full-length
`oddRoundPlan`. The spec flows unchanged through `setSectionSwissMovement` → the
movement route (validated by `swissSpecSchema` from Step 1).

**Design note — "shown only when odd" could not be literally met.** The Swiss
Pairs setup dialog runs at movement-pick time, before pairs are seated, so it
only knows the *table* count, not the *pair* count — and a full Swiss Pairs field
is always `2*tables` (even); "odd" means one empty seat, a seating-time fact. So
unlike `SwissTeamsSetupDialog` (odd *teams* = odd *tables*, knowable), the Swiss
Pairs control is **always offered** and framed conditionally ("If you have an odd
number of pairs…"); it is harmless when the field turns out even (the schema
allows the plan, and the draw ignores odd-handling for an even field). User
chose this (simpler single top-level choice revealing the per-round builder).
Tests: `SwissSetupDialog.test.tsx` (default→bye no plan; half-matches→full plan;
per-round bye toggle; rounds-resize re-sizes the plan; re-open with an existing
plan). Stories: Default (bye), ByeHandling, HalfMatchesEveryRound, MixedPlan
(a11y clean). Full unit suite 3636 pass; tsc + lint clean.

### Step 9 — Traveller / leaderboard

- Traveller: present a HALF_MATCHES board as the two half-matches at the anchor's
  table (half 1 vs X, half 2 vs Y), each physical line selectable for a director
  override. (Pairs traveller has no team framing today — new, but simpler than
  the teams card.)
- Leaderboard: show the anchor's /20 and each non-anchor's played + compensated
  /20 correctly; no board double-counting.
- **Storybook:** add a half-match story to the relevant traveller stories file
  (the director `Traveller.stories.tsx` and/or the player board-results stories),
  and a leaderboard story showing a round with a half-match credited (anchor /20
  + non-anchors' played+compensated /20). Reuse existing story fixtures where
  possible; a11y clean.
- Acceptance: unit + the stories above; a11y clean.

**Done (what landed) — much smaller than first scoped.** A code investigation
showed the traveller pools strictly by board NUMBER and lists every row for that
board, so the anchor's two halves (on DIFFERENT board subsets S1 vs X, S2 vs Y)
already render correctly as ordinary `(ns, ew, result)` lines on their
respective boards — no team-style "card" framing is needed (that was a
misread; cards are the teams traveller). Each real half line is independently
tappable/overridable, keyed by `(round, table, board)`, so the anchor's two
halves override independently with no change.

The ONLY real issue was that the non-played phantom rows (`HALF_AVERAGE`
compensation, and the analogous `SIT_OUT` bye) leaked into the *director*
traveller as stray placeholder rows (phantom opponent, em-dash result, wrongly
tappable). The player-facing scored view already dropped them (it filters to
rows with a result). Fix: `getBoardInstances` (`src/services/board-service.ts`)
now filters out `SIT_OUT` and `HALF_AVERAGE` rows (`NON_TRAVELLER_STATUSES`), so
neither the director traveller, round-results, nor the board route show phantom
lines. This also fixes the pre-existing (unrelated to half-matches) bye leak.

Leaderboard: **no code change** — the Swiss VP leaderboard renders through the
round-agnostic `buildSwissVpTable` (pairId → vpByRound → total), and a
half-match round produces identically-shaped lines (the Step-3 scorer already
credits the anchor's /20 and each non-anchor's played + compensated /20). Added
a documenting story only.

Tests/stories: `board-service.test.ts` (+1, excludes SIT_OUT + HALF_AVERAGE
rows); `Leaderboard.stories.tsx` `SwissPairsHalfMatchRound` (anchor near 20,
non-anchors played+compensated, a11y clean). Full unit suite 3637 pass; tsc +
lint clean.

### Step 10 — Journey + docs

- `tests/journeys/swiss-pairs-half-matches.journey.ts`: create an odd single-
  section Swiss Pairs game, set a plan with a HALF_MATCHES round, seat the field,
  start, score the half-match round over a socket, draw the next round, and
  assert the leaderboard credits anchor/non-anchors as specified.
- Update `docs/director-guide.md` (odd Swiss Pairs handling) and the
  `E2E-COVERAGE-AUDIT.md`.

**Done (what landed).** Journey `swiss-pairs-half-matches.journey.ts` added and
green (odd field of 5 at 3 tables, `A3EW` empty): it starts the game, asserts
round 1 materialises as a half-match group (round-1 statuses contain
`HALF_AVERAGE`, never `SIT_OUT`), scores the played halves by submitting a
matching Pass Out from each played table's **physical** `A{t}NS`/`A{t}EW` seats
over a socket, draws round 2, and asserts the leaderboard shows exactly one row
per seated pair. The new UI fixture is `pickSwissHalfMatchMovement` in
`tests/fixtures/game-setup.ts` (trims rounds first, then selects the "2 half
matches" radio, so the dialog fits a phone viewport).

Bringing the journey green surfaced **three real product bugs**, each fixed with
a regression test (not test-only workarounds):

1. **Round-completeness counted `HALF_AVERAGE` as outstanding.** Both
   `getResultsSummary` (`src/db/games/queries/get-results-summary.ts`, gates the
   "Draw Next Round" button and USEBIO export) and `isRoundComplete` inside
   `src/services/draw-swiss-round-service.ts` (gates the draw preview/commit)
   excluded only `SIT_OUT`. A half-match round's compensation rows are never
   submitted, so `allResultsIn` could never become true and the next round could
   never be drawn. Both now exclude `SIT_OUT` **and** `HALF_AVERAGE`. Tests:
   `get-results-summary.int.test.ts` (+2 cases).
2. **The leaderboard leaked a phantom pair line.** Both Swiss Pairs VP scorers
   (`swiss-ximp-vp-overall.ts`, `swiss-mp-vp-overall.ts`) added each row's EW to
   the round's seen-pairs set, including the phantom EW (`APHANTOM`) of a
   `HALF_AVERAGE` compensation row — so the phantom got a scored line and the
   odd field showed one too many rows. The scorers now skip the EW of a
   `HALF_AVERAGE` row (its NS, the real non-anchor, is already seen via its
   played half). Tests: +1 phantom-exclusion case in each scorer's `*.test.ts`.

A dialog-layout fix also landed: `SwissSetupDialog`'s panel is now
`max-h-[90vh]` with a scrollable body and pinned footer, so a long per-round
plan no longer pushes the confirm button off a small screen.

Full unit suite 3641 pass; `swiss-pairs-half-matches` + `swiss-pairs` journeys
green; tsc + lint clean.

### USEBIO export (after the half-match scorer, Step 3/5)

Spec resolved (Q8, see §6). The current `src/lib/usebio/assemble-swiss-pairs.ts`
is a **head-to-head** VP implementation (sums the two pairs' head-to-head IMPs
and splits the WBF curve 20 ways). This does **not** agree with the cross-IMP VP
leaderboard even for an even full round, and has no concept of half matches. The
rework:

- Each **real half match** → its own `MATCH`, scored **cross-IMP vs the field**
  over that half's boards on a **10-VP scale** (reusing the per-half cross-IMP VP
  the Step 3/5 scorer produces). Within a real half the two pairs share identical
  boards/field, so `NS_SCORE + EW_SCORE = 10`.
- The **anchor** emits two MATCH elements (vs A, vs B); A and B emit one each.
- The sat-out half's **AVE+/AVE compensation** is folded into A's / B's
  `TOTAL_SCORE` only — **no MATCH element** (no opponent to put in EW_SCORE).
- Even-field (non-half) rounds should likewise move to cross-IMP-vs-field VP so
  the export matches the leaderboard.

Sequenced after the scorer exists; built against that spec, not in isolation.

**Done (what landed).** The export and the leaderboard now share ONE per-round
routine, so they cannot drift:

- New `src/scoring/swiss/swiss-vp-round.ts` — `scoreSwissVpRound(rows, mode)`
  returns `{ pairVp, matches }`: each real pair's round VP (including a
  non-anchor's compensated half) and one `SwissVpMatch` (NS/EW VP split) per
  REAL head-to-head half. Both leaderboard overall scorers
  (`swiss-ximp-vp-overall.ts`, `swiss-mp-vp-overall.ts`) were refactored to just
  group by round → `scoreSwissVpRound` → `creditVp` → rank (the duplicated
  field math + per-half helpers moved into the shared routine).
- **Discrete (integer) VP everywhere.** Per the resolved VP-scale decision, both
  the leaderboard AND the export now score on the whole-integer WBF/MP scale
  (`impsToVp(..., "discrete")`, `calculateIndependentMpVP(pct, "discrete")`).
  `mpHalfVp` / `ximpHalfVp` take an explicit `VpScale`. (A follow-up will revisit
  the MP-half VP curve to avoid .5 half-scores; parked by agreement.)
- `assembleSwissPairs(game, club, pairs, boardRows, mode)` emits one `MATCH` per
  real half (anchor → two, one per opponent; ordinary table → one) with the
  shared routine's NS/EW VP, and sums `pairVp` across rounds for each pair's
  `TOTAL_SCORE` / ranking — so the compensated half is credited in `TOTAL_SCORE`
  but never emitted as a MATCH, and the phantom opponent never appears.
  `usebio-service` picks the mode from `classifyEvent` (`MP`→MP; `XIMP` and
  null-mode IMP-scored Swiss both → cross-IMP vs field).
- A real XIMP half's two VPs sum to 10 by construction (equal/opposite integer
  awards); an MP half's are independent per-pair (do not force to 10), matching
  how the leaderboard scores independent MP VP — confirmed with the user.
- Tests: rewrote `assemble-swiss-pairs.test.ts` (14, incl. a half-match block);
  added a DB-backed half-match export case to `usebio-service.int.test.ts`;
  updated the scorer/helper unit tests to the discrete scale. Full unit suite
  3648 pass; tsc + eslint clean. Verified the rendered XML by hand (anchor emits
  two MATCHes 10/0; ordinary tables sum to 20; no `APHANTOM`; non-anchor
  `TOTAL_SCORE` includes its compensation).

### Deferred

- **Exact deterministic anchor rule** when no stationary pair is in the group
  (standing vs lowest id) — pick during Step 2 and record here.
