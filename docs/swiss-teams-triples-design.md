# Swiss Teams triples (triangles) — design

Status: **implemented.** All design questions (Q1–Q13) are settled (see §11) and
the feature is built per the §12 plan: it replaced the old one-round,
three-table Swiss Teams triangle with the **short triple / long triple** model
and renamed all "triangle" terminology to "triple". Covered by unit tests
throughout, plus the `swiss-teams-triples.journey.ts` end-to-end journey (short
and long triples, seat → start → score → draw → leaderboard).

Companion document: Swiss **Pairs** has deviated enough that its odd-field
handling is a separate feature with its own terminology ("2 half matches") —
see `docs/swiss-pairs-half-matches-design.md`. This document is **Teams only**.

## 1. Background: what a triple is (teams)

When a Swiss **Teams** event has an **odd number of teams**, one team would
otherwise sit out each round (a *bye*). A **triple** (a.k.a. triangle) avoids a
full sit-out by having **three teams play a three-way** instead: over the triple
each of the three meets both of the others, and the three-way is scored so all
three get a real result rather than an average.

There are **two kinds of triple**, chosen per round by the director at setup:

| Triple type  | Time it takes    | Boards per mini-match   | How it works                                                                 |
| ------------ | ---------------- | ----------------------- | ---------------------------------------------------------------------------- |
| Short triple | One normal round | Half the round's boards | Within one round the three play a round-robin of three head-to-head half-matches (x-y, y-z, z-x), each on its own half-sized board set (A, B, C); the travelling (away) pairs switch tables at the round's midpoint. See §4/§5. |
| Long triple  | Two full rounds  | Full boards             | The three play a round-robin of three full head-to-head matches spread across two full playing periods.        |

A team is two pairs at a home table, so both the short and the long triple work
by the away (EW) pairs travelling while home (NS) pairs stay — the long triple
is meaningful precisely because a team has two pairs (unlike pairs, where a long
triple would just be two byes — hence pairs don't have long triples).

## 2. What exists today (and why it must change)

The current Swiss Teams "triangle" (`oddHandling: "TRIANGLE"`) is **neither** a
short nor a long triple. It seats the three teams at **three concurrent tables**
in one round (A-NS/B-EW, B-NS/C-EW, C-NS/A-EW), each playing the **full** board
set, and compares all three tables board-by-board (cross-IMP). That is:

- full boards (like a long triple), but
- in a **single** round slot (unlike a long triple's two rounds), by spending an
  extra table.

It requires no mid-round movement and no board splitting. It is a valid way to
run a three-way, but it is **not** either of the two options the director wants.
This design **replaces** it.

Relevant current code (to be reworked):

- Spec/schema: `swissTeamsSpecSchema` (`src/model/selected-movement.ts`),
  `oddHandling: "BYE" | "TRIANGLE"`.
- Draw engine: `chooseTeamTriangle`, `expandTeamTriangle`, `drawSwissTeamsRound`
  (`src/movement/swiss-teams/swiss-teams-pairing.ts`).
- Round board range: `swissRoundBoardRange(roundNumber, boardsPerRound)`
  (`src/services/materialize-swiss-round.ts`) — round R plays boards
  `(R-1)*bpr+1 .. R*bpr`, every table the same set.
- Materialize: `materializeSwissTeamsRound` / `swissTeamsRoundToMaterializable`.
- Reconstruction + scoring: `team-match.ts` (`groupTeamTriangles`,
  `triangleTeamImps`, `triangleTeamWins`, `triangleSubMatches`) consumed by
  `teams-vp-overall.ts`, `teams-imp-aggregate-overall.ts`,
  `teams-board-comparison-overall.ts`. **Note (post VP-scale work):** the VP
  conversion in `teams-vp-overall.ts` (and the USEBIO export in
  `assemble-swiss-teams.ts`) no longer uses the continuous WBF formula — it now
  routes every IMP→VP through the EBU discrete scale in
  `src/scoring/swiss/imp-vp-table.ts` (`impVpWinner` for a head-to-head margin,
  `impVpSided` for a per-team independent cross-IMP total), yielding
  whole-integer VP. The triple's three-way credit already goes through
  `impVpSided(crossImps, boardsPlayed, 20)`. The old `wbf-vp.ts` has been
  removed. Any triple rework must keep using `imp-vp-table.ts`, not reintroduce
  a continuous curve.
- Setup UI: `SwissTeamsSetupDialog.tsx` (Bye/Triangle radio).
- Traveller: team-framed "Three-way" card (`board-service.ts` +
  `Traveller.tsx`).

## 3. Director configuration — RESOLVED

The director sets **how many rounds** the event has, and — as part of the
movement info, **at setup** — a **per-round schedule** declaring what happens to
the odd team each round. Fixed up front (not chosen live).

**Per-round schedule.** One entry per round; each round is a **BYE**, a **SHORT**
triple, or part of a **LONG** triple. A long triple spans two rounds, so it
occupies **two consecutive entries** (rounds R and R+1).

Proposed spec shape on `swissTeamsSpecSchema`:

```
oddHandling: "BYE" | "TRIPLE"
// when "TRIPLE": one entry per round. A LONG triple spans two consecutive
// rounds and carries a GROUP id so its two halves are unambiguously linked
// (so two adjacent long triples don't blur together — RESOLVED Q10).
oddRoundPlan: ( "BYE"
              | "SHORT"
              | { kind: "LONG"; group: number }  // two adjacent entries share `group`
              )[]                                  // length === rounds
```

Example (7 rounds):
`["BYE","SHORT",{LONG,1},{LONG,1},"SHORT","BYE","SHORT"]` — rounds 3–4 are long
triple group 1. Two back-to-back long triples are unambiguous:
`[{LONG,1},{LONG,1},{LONG,2},{LONG,2}, ...]` — rounds 1–2 are group 1, 3–4 group
2.

Validation:
- A `{LONG, g}` entry must appear in **exactly two** positions, and they must be
  **adjacent** (rounds R and R+1). Group ids are otherwise arbitrary labels
  (unique per long triple); they only need to pair the two halves.
- `BYE` / `SHORT` / `LONG` may be freely mixed, the only constraint being each
  long group's two entries are adjacent.
- Only meaningful when the team count is odd; an even field ignores the plan.

The `SwissTeamsSetupDialog` gains, when the field is odd, a per-round control to
build this plan (replacing today's single Bye/Triangle radio).

## 4. Board mathematics

Today every round plays a fixed `boardsPerRound` on fresh, growing board numbers
(`swissRoundBoardRange`). Triples change this per-round accounting:

- **Short triple — THREE half-sized board sets A, B, C (RESOLVED, Q12).** The
  round's `boardsPerRound` splits into two halves of `halfSize =
  floor(boardsPerRound / 2)` exactly as Swiss Pairs (`swissHalfMatchBoardSplit`
  in `src/services/materialize-swiss-round.ts` — the odd board is dropped, e.g.
  a 7-board round → halves of 3). **Sets A and B are the round's two halves**,
  the same boards the **rest of the room** plays as its normal round. The triple
  needs a **third** set **C**, also `halfSize` boards, that **no one else in the
  room plays** — so these three teams never meet set C again later in the
  session. Each team plays two of the three sets (A+C, A+B, or B+C), i.e. a full
  round's worth (`2 * halfSize`), split across its two opponents.

  Board numbering: A and B occupy the round's normal range; **C continues from
  where the room leaves off** — the first board number beyond every normal
  round's range (`totalRounds * boardsPerRound + 1`), so no one else plays them
  and no board is ever repeated by any pair. Several triples all share the SAME
  C band: two triples can reuse C's board numbers because their teams are
  disjoint, so no pair ever plays a C board twice. (A board rule, per pair: each
  of the six pairs — three teams × home/away — plays two DISTINCT sets, so no
  pair plays a board twice. The two pairs of one team legitimately play the same
  set in different rooms, as in any teams match.)

  **The seating (one table per line; left = NS pair's team, right = EW pair's
  team; home NS pairs never move, away EW pairs travel):**

  | Table (home NS) | Away EW | Board set |
  | --------------- | ------- | --------- |
  | x | y | A |
  | y | z | B |
  | z | x | C |
  | x | z | C |
  | y | x | A |
  | z | y | B |

  Set A compares `x-NS v y-EW` with `y-NS v x-EW` → the **x v y** half-match.
  Set B → **y v z**. Set C → **z v x**. The away pairs switch at the round's
  midpoint (half 1 = the first three rows, half 2 = the last three). All three
  teams play all their boards; **no unplayed-board compensation for teams**
  (contrast Swiss Pairs, where two pairs genuinely sit out a half).
- **Long triple — the SAME three-set A/B/C layout, over FULL board sets, spread
  across two round slots.** A long triple is a short triple scaled up: the three
  head-to-head comparisons (x-y on A, y-z on B, z-x on C) are each a proper
  **same-boards** two-room comparison, but each set is a **full** `boardsPerRound`
  set rather than a half. **Set A = round R's full range, set B = round R+1's
  full range** (the two round slots the rest of the room plays), and **set C is
  a full fresh set continuing from where the room leaves off** (exactly like
  short's C, but full-size). The six table-rows are the same as short, with
  half 1 played in round R and half 2 in round R+1 (see §6). Each team plays two
  of the three full sets — a full round's worth per round slot — and the two
  rooms of every comparison are on the SAME set, so each comparison IMPs
  cleanly. No deal is ever replayed (the per-pair board rule holds).

**Board rule.** The hard constraint: **no pair plays the same board (deal)
twice** — each of the six pairs plays two DISTINCT sets. Board numbers otherwise
grow per round as today. Both short and long use three disjoint sets A/B/C (A/B
within the room's round ranges, C continuing beyond them), so no pair repeats a
board.

## 5. Scoring

Because every team plays all its boards (short: two half-matches of one round;
long: both of its two rounds), **there is no sit-out and no unplayed-board
compensation anywhere in the teams triple**. But — RESOLVED, correcting an
earlier draft — the short triple is **NOT** scored as today's cross-IMP-across-
three-tables. It is **three independent head-to-head half-matches**, structurally
the Swiss **Pairs** "2 half matches" pattern applied to teams:

- **Short triple — three head-to-head half-matches (RESOLVED, Q12).** The three
  teams x, y, z play three head-to-head mini-matches, each over its own
  half-sized board set, each a normal two-team IMP comparison:
  - **x v y** on board set **A**
  - **y v z** on board set **B**
  - **z v x** on board set **C**

  Each mini-match's net IMP margin converts to VP on the **10-VP half scale**
  (`impVpWinner(|margin|, halfBoards, 10)`, the loser taking `10 − winner`, so a
  half's two teams sum to 10 — a genuine head-to-head, NOT the independent
  cross-IMP sided scale). Each team plays **two** of the three half-matches
  (x: A and C; y: A and B; z: B and C), and a team's round VP is the **sum of
  its two halves**, out of 20 — exactly the pairs 2-half-matches crediting, just
  head-to-head per half instead of field-relative.

  So the short triple **does** use the 10-VP half scale (this corrects the
  earlier note that said teams always use the 20-VP pool). What differs from
  pairs: a team plays BOTH its halves (no sit-out, no AVE+/AVE compensation),
  because a team has two pairs and travels its away pair.

- **Long triple (RESOLVED, Q13) — the short triple on FULL board sets, spread
  over two rounds.** The same three head-to-head comparisons (x-y on A, y-z on B,
  z-x on C), each a proper same-boards two-room comparison exactly as short — but
  each set is a **full** `boardsPerRound` set (A = round R's range, B = round
  R+1's range, C a full fresh set beyond the room's range, see §4). Each
  comparison therefore IMPs cleanly on its own full set, scored on the normal
  **20-VP** full scale (`impVpWinner(|margin|, fullBoards, 20)`, loser `20 −
  winner`). The six rows of §4 are played with half 1 in round R and half 2 in
  round R+1 (§6), so the three teams get through all of A, B, C across the two
  round slots. (There is NO cross-round pairing of a single comparison: a
  comparison's two rooms are always on the SAME set, never one room in R and the
  other in R+1.)

  **Per-round VP crediting:**
  - **Between the two rounds** (R scored, R+1 not yet): all three teams show the
    neutral **10 VP** in both R and R+1, so a half-played triple doesn't lurch
    the standings.
  - **After both rounds are scored:** each team gets its **two** full-comparison
    results, split across R and R+1 by the order **its NS (home) pair met its
    opponents** — the opponent its NS pair hosted in round R → that result is
    credited to round R; the opponent hosted in round R+1 → credited to R+1.
    (E.g. x·NS hosts y in R and z in R+1, so x's x-y result lands in R and its
    x-z result in R+1.) This is per team and reconstructable directly from the
    board rows (NS team, EW team, round), needs no stored state, and keeps one
    VP per team per round. Note the split is a cosmetic per-round display choice:
    a single comparison can land in different rounds for its two teams, but each
    team's session total (the sum of its two comparisons) is unaffected.

**Implication for the code.** The current cross-IMP triple machinery
(`triangleTeamImps`, `triangleTeamWins`, and the `impVpSided(crossImps, …, 20)`
crediting in `teams-vp-overall.ts` / `teams-imp-aggregate-overall.ts` /
`teams-board-comparison-overall.ts`, plus `triangleCrossVp` in the USEBIO
assemblers) is **obsolete** under this model and is removed. The short triple is
scored as three ordinary two-team head-to-head matches on half board sets —
reusing the existing two-team machinery (`groupTeamMatches` / `teamMatchBoardImps`
/ `teamMatchBoardWins`) per half, with the 10-VP half pool — not a bespoke
three-way scorer. For BAM/PAB the three half-matches are likewise ordinary
board-comparison matches on their half sets.

## 6. Seating and movement

The three teams of a triple are, in ascending home-table order, A < B < C. A
team match always seats the home (NS) pair at its own table and the opponent's
away (EW) pair travels in — so **the mover is always an away pair**; home pairs
never leave their tables. There is **no "anchor" and no sit-out for teams**: all
three teams play all their boards (this is the key difference from the pairs
"2 half matches", where two pairs genuinely sit a half out).

**Timer: do NOT touch the timer.** The phase/move machinery is for the rest of
the room playing standard matches; a short triple's mid-round away-pair switch
is a local instruction to the three teams' away pairs, driven by the schedule,
and must not alter the room-wide timer or phases.

### How the three teams all meet (full coverage)

The three teams meet in a **round-robin of three head-to-head half-matches** —
x v y, y v z, z v x — each on its own board set (A, B, C respectively, see §4).
Every pairing is played exactly once, so all three pairings (x-y, y-z, z-x) are
covered. This is **not** today's cross-IMP-across-three-tables comparison; it is
three ordinary two-team comparisons on three disjoint board sets.

- **Short triple (one round, two halves) — RESOLVED (Q12).** The six table-rows
  of §4 are played as two halves (away pairs switch at the midpoint): half 1 is
  rows `x·NS v y·EW–A`, `y·NS v z·EW–B`, `z·NS v x·EW–C`; half 2 is
  `x·NS v z·EW–C`, `y·NS v x·EW–A`, `z·NS v y·EW–B`. Each home pair hosts two
  board sets; each away pair visits two home tables; every pair plays two
  distinct sets so no board repeats. The three head-to-head comparisons (x-y on
  A, y-z on B, z-x on C) each span one row from each half.
- **Long triple (two rounds) — RESOLVED (Q13).** The short triple's six rows,
  with half 1 → round R and half 2 → round R+1, each on that round's full board
  set (see §5): round R is `x·NS v y`, `y·NS v z`, `z·NS v x`; round R+1 is
  `x·NS v z`, `y·NS v x`, `z·NS v y`. Movement between R and R+1 is the normal
  between-rounds move (no mid-round switch). Honour stationary pairs: if one of
  the three has a stationary constraint it keeps its home seat; otherwise
  deterministic.

Note: the pairs-style "anchor plays while the other two each sit a half" model
does **not** apply to teams — that was a pairs concept and has been removed from
this teams document.

## 7. Round model & the draw

A long triple consuming two round slots is the biggest structural change:

- The **draw** must recognise a round scheduled as a long triple, lay out the
  two-round encounter, and **not draw a fresh round** for the second slot.
- **Standings timing:** a long triple's result isn't final until its second
  round completes, which affects when subsequent draws can rank the field.
- **Triple/bye selection** keeps a "hasn't had one recently" fairness rule
  (today `chooseTeamTriangle`), now spanning short, long, and bye.

**Round accounting.** The declared round count = **playing periods**; a long
triple consumes two of them (its two adjacent `"LONG"` plan entries). A 7-round
event with one long triple has 7 playing periods, the long triple using two.

## 8. Traveller, leaderboard, USEBIO

- **Traveller:** a short triple is three head-to-head half-matches (x-y on A,
  y-z on B, z-x on C), each over its own half board set. The traveller should
  present them as three ordinary two-team match cards (one per board set), not a
  single "three-way" card — the old three-way/triangle card goes away. Each
  physical table row stays independently selectable for director override. A
  long triple is two ordinary rounds, rendered as normal.
- **Leaderboard:** a short triple credits each of its three teams the **sum of
  its two head-to-head half-matches**, each scored on the **10-VP half scale**
  (`impVpWinner(|margin|, halfBoards, 10)` + mirror), summing to the team's /20
  round VP — exactly like Swiss Pairs 2-half-matches, but head-to-head per half
  and with both halves actually played (no compensation). A long triple credits
  each team its two full-boards head-to-head comparison results on the normal
  **20-VP** scale, split across rounds R and R+1 by the NS-pair's host order
  (§5): neutral 10/10 in both rounds until R+1 is scored, then one comparison VP
  per round. All VP are whole integers from `imp-vp-table.ts`.
- **USEBIO:** a short triple exports as the **three** head-to-head `<MATCH>`
  nodes (x-y, y-z, z-x), each on its half board set, with VP on the 10-VP half
  scale (`impVpWinner`), all in the one round — this replaces the old
  "three pairwise nodes sharing one round from a cross-IMP triangle"
  (`triangleSubMatches`/`triangleCrossVp` are removed). A long triple exports as
  three head-to-head `<MATCH>` nodes too, each on full boards (20-VP scale) and
  tagged with its first round R (the comparison's two rooms span R and R+1, so
  the node sits in R). A USEBIO `<MATCH>` node has a single round and both
  teams' scores, so it cannot express the per-team NS-host-order round split
  (that is a live-leaderboard display nuance only); the export's authoritative
  per-team session totals are the sum of a team's two comparison nodes, which
  the split never changes. The VP conversion is the EBU discrete scale
  throughout (`imp-vp-table.ts`).

## 9. Migration / compatibility

- The existing `oddHandling: "TRIANGLE"` value and the one-round three-table
  behaviour are **removed/replaced**. Any persisted games using it (test
  fixtures, in-flight events) break — **confirmed acceptable (Q9): the code is
  not live**, so there is no migration; the value and its cross-IMP machinery
  are deleted outright.
- The stale `swissTeamsSpecSchema` docstring claiming TRIANGLE "is rejected at
  start" is already wrong (it is implemented today); rewritten by this work.

## 10. Scope summary (teams)

1. Spec/schema — `oddHandling: "BYE" | "TRIPLE"` + `oddRoundPlan`
   (`"BYE" | "SHORT" | { kind: "LONG"; group: number }`, length === rounds, each
   LONG group's two entries adjacent) on `swissTeamsSpecSchema`.
2. Setup UI — odd-field per-round plan builder in `SwissTeamsSetupDialog`.
3. Draw engine — short/long triple selection + layout; long-triple two-round
   handling (`swiss-teams-pairing.ts`).
4. Board maths + materialization — half-round split (short) and two-round span
   (long); board allocation (`materialize-swiss-teams-round.ts`).
5. Scoring — a short triple is three head-to-head half-matches (x-y/A, y-z/B,
   z-x/C), each scored on the **10-VP half scale** (`impVpWinner(|margin|,
   halfBoards, 10)`), a team's two halves summed to /20 — the Swiss Pairs
   2-half-matches crediting, head-to-head per half, both halves played (no
   compensation). A long triple is the same three comparisons over full boards
   across two rounds (20-VP scale, both rooms combined), neutral 10/10 until the
   second round is scored, then each team's two comparison results split across
   R and R+1 by its NS-pair's host order (§5). Reuse the existing two-team
   machinery (`groupTeamMatches` / `teamMatchBoardImps` / `teamMatchBoardWins`)
   per half (short) and per full comparison (long); the cross-IMP three-way
   scorers are removed (see §5 "Implication for the code").
6. Seating/movement — midpoint away-pair switch (short); normal between-rounds
   move (long). No timer changes.
7. Traveller / leaderboard / USEBIO — render and export short/long triples as
   three ordinary head-to-head comparisons (short: on half sets, one round;
   long: on full boards spanning the two rounds, each credited to a round by the
   NS-host-order split).
8. Remove the current one-round three-table triangle and all its cross-IMP
   machinery.
9. **Terminology + cleanup (cross-cutting):** rename every "triangle" /
   "TRIANGLE" to "triple" across code, types, tests, stories, test-ids and
   display text (e.g. `TeamsTriangle`→triple, `oddHandling:"TRIANGLE"`,
   `chooseTeamTriangle`, `expandTeamTriangle`, `groupTeamTriangles`,
   `triangleTeamImps`/`Wins`/`SubMatches`, `TeamsTriangleEntry`,
   `NamedTeamsTriangle`, `recoverTriangleTeams`, `TeamTravellerMatch.triangle`,
   the `teams-triangle` test-id, "Three-way (triangle)" headings). Delete the
   now-dead cross-IMP triple scorers and `triangleCrossVp` rather than renaming
   them. Keep the Swiss **Pairs** `HALF_MATCHES` names untouched.

## 11. Open questions

Resolved: Q1 (per-round `oddRoundPlan`); Q2 (never replay a board; halves/round
ranges); Q3 (**no unplayed-board compensation for teams** — every team plays all
its boards; a short triple is three head-to-head half-matches on the 10-VP scale
summed to /20; a long triple is the same three comparisons over full boards
across two rounds); Q4 (long triple VP: neutral 10/10 until R+1 is scored, then
each team's two full-comparison results split across R and R+1 by its NS-pair's
host order — §5); Q5 (don't touch the timer); Q7 (declared rounds = playing
periods, long triple consumes two); **Q12** (short triple = three head-to-head
half-matches x-y/A, y-z/B, z-x/C with the fixed six-row seating + midpoint
away-pair switch in §4/§6; three disjoint board sets A/B/C, C on fresh board
numbers; scored on the 10-VP half scale, summed to /20); **Q13** (long triple =
the short triple's six rows spread over two rounds R and R+1 on full boards; no
extra board set; crediting per Q4; a long triple's VP is only final once R+1 is
scored, and LONG entries are adjacent so no draw happens between R and R+1). The
pairs-style "anchor" concept does **not** apply to teams, so the earlier anchor
question is dropped for this document.

Also resolved: **Q8** USEBIO mapping — a short triple exports as three
head-to-head `<MATCH>` nodes (x-y, y-z, z-x) on their half board sets, all in
the one round, 10-VP scale; a long triple exports as three head-to-head nodes on
full boards (20-VP scale), each tagged with its first round R (a `<MATCH>` node
has one round, so the per-team NS-host-order round split — a live-leaderboard
nuance — isn't carried; the export's per-team session totals are the sum of the
comparison nodes, unaffected by the split). **Q9** confirmed — the code is
not live, so breaking any `oddHandling: "TRIANGLE"` games/fixtures is fine; the
old value and cross-IMP machinery are removed outright (no migration). **Q10**
confirmed — BYE / SHORT / LONG may be freely mixed; each long triple carries a
`group` id so its two adjacent entries are unambiguously linked (§3).

All design questions are resolved; the document is ready to implement against.

## 12. Implementation plan (attack piece by piece)

Engine-first and incremental, mirroring how the Swiss **Pairs** 2-half-matches
work was staged. Each step lands green — `npx tsc --noEmit`, `npx eslint` on the
touched files, and the relevant `npx vitest --project unit --run` — before the
next. Pause for review after each step. No step touches the timer.

Terminology: every step also renames the "triangle"/"TRIANGLE" it touches to
"triple" (do not leave a mixed vocabulary behind a step). The dead cross-IMP
three-way scorers are **deleted**, not renamed.

Legend: files are the primary edits; "verify" is the green gate for the step.

---

### Step 0 — Rename triangle → triple (mechanical, no behaviour change)

Pure rename/cleanup so every later step works in one vocabulary. No logic
changes; the current one-round cross-IMP behaviour still works identically after
this step (it is replaced in later steps).

- Rename across code + tests + stories: `TeamsTriangle`→`TeamsTriple`,
  `chooseTeamTriangle`→`chooseTeamTriple`, `expandTeamTriangle`→`expandTeamTriple`,
  `groupTeamTriangles`→`groupTeamTriples`, `triangleTeamImps`/`Wins`/`SubMatches`
  → `triple…`, `TeamsTriangleEntry`→`TeamsTripleEntry`,
  `NamedTeamsTriangle`→`NamedTeamsTriple`, `recoverTriangleTeams`→
  `recoverTripleTeams`, `hadTriangle`→`hadTriple`, `TeamTravellerMatch.triangle`
  → `.triple`, the `teams-triangle` test-id → `teams-triple`, "Three-way
  (triangle)" display → "Three-way" (interim), and the `oddHandling` enum value
  `"TRIANGLE"` → keep as-is for THIS step (schema change is Step 1) OR rename to
  `"TRIPLE"` now and update its few readers — pick whichever keeps the step
  smallest; recommended: leave the enum literal until Step 1 so Step 0 is a pure
  identifier rename.
- Keep Swiss **Pairs** `HALF_MATCHES` names untouched.
- Files: all those listed in the inventory (`swiss-teams-pairing.ts`,
  `team-match.ts`, `teams-vp-overall.ts`, `teams-imp-aggregate-overall.ts`,
  `teams-board-comparison-overall.ts`, `materialize-swiss-teams-round.ts`,
  `draw-swiss-teams-round-service.ts`, `swiss-teams-seating-names.ts`,
  `board-service.ts`, `participants.ts`, `swiss-service.ts`,
  `assemble-swiss-teams.ts`, `assemble-imp-aggregate-teams.ts`,
  `assemble-board-comparison-teams.ts`, `draw-next-teams-round.handler.ts`,
  `SwissTeamsDrawControl.tsx`, `SwissTeamsDrawPreview.tsx`, `Traveller.tsx`, +
  their tests/stories).
- Verify: full unit suite green (behaviour unchanged); tsc + lint clean.

### Step 1 — Spec/schema: `oddRoundPlan` with grouped LONG

- `swissTeamsSpecSchema` (`src/model/selected-movement.ts`):
  `oddHandling: "BYE" | "TRIPLE"`; add `oddRoundPlan?: (…)[]` per §3
  (`"BYE" | "SHORT" | { kind: "LONG"; group: number }`), with a `superRefine`
  enforcing: length === rounds; each LONG group id appears in exactly two
  adjacent positions; plan only required/valid when `oddHandling === "TRIPLE"`.
  Mirror the pairs `swissSpecSchema` `oddRoundPlan` validation.
- Update derived types (`SwissTeamsOddHandling`, any `SwissTeamsOddRound`) and
  `selectedMovementsEqual` SWISS_TEAMS case.
- Files: `selected-movement.ts` (+ `.test.ts`).
- Verify: `selected-movement.test.ts` (new plan validation cases) green.

### Step 2 — Pure draw engine: short/long triple selection + layout

The heart of the change; no DB/UI yet. Pure functions + unit tests.

- `swiss-teams-pairing.ts`:
  - `OddHandling` → `"BYE" | "TRIPLE"`; a round's resolution comes from the
    plan (`"BYE" | "SHORT" | { LONG, group }`), threaded in as draw input.
  - `chooseTeamTriple` fairness rule: pick the bottom three without a recent
    triple (keep today's logic, now covering SHORT and LONG; byes unchanged).
  - Replace `expandTeamTriple` with the §4 six-row layout: a function returning
    the three head-to-head half/round comparisons (x-y, y-z, z-x) and, for each,
    the two table-rows (home NS vs away EW) and which board SET (A/B/C for short;
    round R vs R+1 for long).
  - Long triple: the draw must emit a TWO-round encounter and not draw a fresh
    round for the second slot (round R+1 is the LONG group's second entry).
  - `swissTeamsRoundOne` round-1 deterministic resolution updated for the plan's
    round-1 entry.
  - `swapTeams`/`roundTeamIds`/`evaluateSwissTeamsRound` updated for the new
    triple shape (three edges x-y/y-z/z-x still the repeat-advisory edges).
- Files: `swiss-teams-pairing.ts` (+ `.test.ts`).
- Verify: `swiss-teams-pairing.test.ts` — new short/long layout + fairness +
  round-1 cases green.

### Step 3 — Board maths + materialization

- `materialize-swiss-teams-round.ts`:
  - Short triple: three head-to-head comparisons over sets A, B, C where
    `A`,`B` are the round's two halves (`swissHalfMatchBoardSplit`, odd board
    dropped) and `C` is a fresh half-sized set on **new board numbers** beyond
    the room's range for that round. Lay out the six table-rows (NS home / EW
    away) with the midpoint switch.
  - Long triple: the six rows across rounds R and R+1 on each round's full board
    range; no extra set.
  - Decide + document the board-number allocation for C (and confirm no clash
    with later rounds' ranges).
- Files: `materialize-swiss-teams-round.ts` (+ `.test.ts`); maybe a small shared
  helper for the A/B/C split next to `swissHalfMatchBoardSplit`.
- Verify: `materialize-swiss-teams-round.test.ts` — board rows for short + long
  (ns/ew ids, table numbers, board ranges, no repeats) green.

### Step 4 — Reconstruction + scoring (delete cross-IMP; head-to-head halves)

- `team-match.ts`: **delete** `triangleTeamImps`, `triangleTeamWins`,
  `triangleCrossVp`-style cross-IMP; keep/adapt triple *detection*
  (`groupTeamTriples` / 3-cycle keys) only as far as needed to identify a
  triple's rows, then score each of the three head-to-head comparisons with the
  existing two-team machinery (`teamMatchBoardImps` / `teamMatchBoardWins`) on
  its board set.
- Scorers:
  - `teams-vp-overall.ts`: short triple → three head-to-head halves, each
    `impVpWinner(|margin|, halfBoards, 10)` + mirror, a team's two halves summed
    to its /20 round VP. Long triple → three full head-to-head comparisons
    (`impVpWinner(…, fullBoards, 20)`), neutral 10/10 until R+1 scored, then
    split across R/R+1 by NS-host order (§5).
  - `teams-imp-aggregate-overall.ts`: analogous with raw IMP margins per
    half/comparison.
  - `teams-board-comparison-overall.ts`: BAM/PAB per half/comparison via the
    two-team board-comparison path.
- Files: `team-match.ts`, the three overall scorers (+ their `.test.ts`).
- Verify: `team-match.test.ts`, `teams-vp-overall.test.ts`,
  `teams-board-comparison-overall.test.ts`, teams-imp-agg tests green;
  leaderboard-service teams tests green.

### Step 5 — Draw service + socket (history, preconditions, standings timing)

- `draw-swiss-teams-round-service.ts`: `getSwissTeamsHistory` recovers triples
  (short + long) and `hadTriple` from board rows; `recoverTripleTeams` updated
  for the new seating; round-completeness + the long-triple standings-timing
  rule (a long triple's VP only final once R+1 is scored; no draw between a
  LONG group's two rounds); `oddHandling`/plan plumbed through the draw context.
- `swiss-service.ts` (`TeamsTripleEntry`, preview/commit payloads) +
  `draw-next-teams-round.handler.ts` (zod schema) updated for the plan + new
  triple shape.
- Files: those three (+ their `.test.ts` / `.int.test.ts`).
- Verify: `draw-swiss-teams-round-service.test.ts` + `.int.test.ts`,
  handler test green.

### Step 6 — USEBIO export

- `assemble-swiss-teams.ts` (+ the imp-aggregate and board-comparison teams
  assemblers): a short triple → three head-to-head `<MATCH>` nodes on their half
  sets, one round, 10-VP; a long triple → three head-to-head nodes on full
  boards, each tagged with the round its result credits (NS-host-order split).
  Remove `triangleSubMatches`/`triangleCrossVp` usage; reuse the two-team match
  emission per comparison.
- Files: the three team assemblers (+ `.test.ts`), `generate-usebio.ts` if its
  teams path needs it, `usebio-service.int.test.ts`.
- Verify: those tests green; hand-check a rendered short + long triple file.

### Step 7 — Setup UI: per-round plan builder

- `SwissTeamsSetupDialog.tsx`: replace the Bye/Triangle radio with, when the
  field is odd, a top-level Bye vs Triple choice that reveals a per-round plan
  builder (BYE / SHORT / LONG per round, LONG auto-grouping two adjacent
  rounds), mirroring the pairs `SwissSetupDialog` per-round plan. Build/emit the
  `oddRoundPlan` with group ids; validate adjacency in the UI.
- Files: `SwissTeamsSetupDialog.tsx` (+ `.test.tsx`, `.stories.tsx`),
  `SectionMovementPicker.test.tsx` (plan on confirm).
- Verify: those tests + stories green.

### Step 8 — Draw preview + traveller rendering

- `SwissTeamsDrawControl.tsx` / `SwissTeamsDrawPreview.tsx`: render a short/long
  triple (three head-to-head comparisons; long shows its two rounds); update the
  `teams-triple` test-id + headings; swap-into-triple edit logic.
- Traveller: `board-service.ts` builds three two-team match cards for a triple
  (not one "three-way" card); `Traveller.tsx` + `TeamTravellerMatch` updated;
  `participants.ts` `.triple` flag usage.
- Files: those (+ their tests/stories).
- Verify: component/story tests green.

### Step 9 — Journey + docs

- Playwright journey: odd Swiss Teams field, a plan with a SHORT and a LONG
  triple, seat → start → score → draw → leaderboard credits all teams; assert
  the short-triple half-match rows and the long-triple two-round crediting.
- Update `docs/director-guide.md` (odd Swiss Teams handling: bye / short triple
  / long triple) and `E2E-COVERAGE-AUDIT.md`; mark this design "implemented".
- Verify: journey green; full unit suite + tsc + lint clean.

---

**Dependency order:** 0 → 1 → 2 → 3 → 4 → 5 → 6, with 7/8 after 1 (UI needs the
schema) and ideally after 5 (so the preview reflects the real draw), and 9 last.
Steps 2–4 are the engine core and the riskiest; land them with thorough unit
tests before the service/UI layers. Each step is independently reviewable and
leaves the suite green.
