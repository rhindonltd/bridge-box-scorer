# Swiss Teams triples (triangles) — design

Status: **draft for review.** Design/requirements document, not implemented yet.
It replaces the current one-round, three-table Swiss Teams triangle with a
proper **short triple / long triple** model.

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
| Short triple | One normal round | Half the round's boards | The three play two shortened mini-matches within one round; the travelling (away) pairs switch tables at the round's midpoint. |
| Long triple  | Two full rounds  | Full boards             | The three play a triangular rotation across two full playing periods.        |

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
  `teams-board-comparison-overall.ts`.
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
// when "TRIPLE": one entry per round; a LONG occupies two consecutive rounds.
oddRoundPlan: ("BYE" | "SHORT" | "LONG")[]   // length === rounds
// (a LONG appears as two adjacent "LONG" entries, rounds R and R+1)
```

Example (7 rounds): `["BYE","SHORT","LONG","LONG","SHORT","BYE","SHORT"]` —
rounds 3–4 are one long triple; the rest are per-round byes/short triples.

Validation: the number of `"LONG"` entries must be even and adjacent in pairs
(each long triple = exactly two consecutive rounds). Only meaningful when the
team count is odd; an even field ignores the plan.

The `SwissTeamsSetupDialog` gains, when the field is odd, a per-round control to
build this plan (replacing today's single Bye/Triangle radio).

## 4. Board mathematics

Today every round plays a fixed `boardsPerRound` on fresh, growing board numbers
(`swissRoundBoardRange`). Triples change this per-round accounting:

- **Short triple** — the round's `boardsPerRound` is **split into two halves**
  (odd counts round *down* to the nearest even per the EBU convention: a 7-board
  round becomes 3 + 3, discarding one board). **Every team in the triple plays
  BOTH halves** — because a team has two pairs, each team's home pair hosts both
  halves while its away pair travels, so a team faces a different one of the
  other two in each half and **no team sits out any boards**. All three play the
  full (even) board set, just split across two opponents. There is therefore
  **no unplayed-board compensation for teams** (contrast Swiss Pairs, where two
  pairs genuinely sit out a half — see the pairs document).
- **Long triple** — spans **two** round slots; each team plays full boards in
  each of its two matches. The rest of the field plays two normal rounds.

**Board rule.** The hard constraint: **a team must never play the same board
twice.** Board numbers otherwise grow per round as today. A short triple's two
mini-matches use **different halves** of the round's board set; a long triple's
two rounds use their two distinct round board ranges — so no repeats either way.

## 5. Scoring

Because every team plays all its boards (short: both halves of one round; long:
both of its two rounds), **there is no sit-out and no unplayed-board
compensation anywhere in the teams triple** — scoring is purely the three-way
comparison, as today.

- The comparison itself is scored as it is today (cross-IMP / Butler across the
  three for VP and aggregate-IMP; board comparison for BAM/PAB) — the existing
  `triangleTeamImps` / `triangleTeamWins` machinery is reused.
- **Short triple:** the three-way comparison runs across the round's two halves
  (each team's two half-matches against the other two) and credits the round's
  VP exactly as a normal round — one round's worth of VP, no average credit.
- **Long triple:** full boards over two rounds. Each of a team's two matches is
  credited to **its own round** (not aggregated) — round R gets that round's
  result, round R+1 the next — so per-round VP totals stay per round like normal
  rounds.

So the teams triple does **not** introduce a partial-round crediting rule; it
reuses the existing full-round three-way comparison. (The one genuinely new
scoring rule in this whole area is the Swiss **Pairs** split AVE+/AVE
compensation — see the pairs document.)

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

Because every board is played at all three home tables and the three-way is
scored by comparing all three tables board-by-board (cross-IMP / board
comparison), **every team is effectively compared against both others** — the
comparison inherently covers all three pairings (A-B, B-C, A-C). This is
unchanged from today's one-round three-table triangle; the only change is *when*
the boards are played:

- **Short triple (one round, two halves):** each home table hosts two
  half-matches — in half 1 its away opponent is one of the other two teams, in
  half 2 the other. The away pairs rotate at the midpoint so, across the two
  halves, each home pair has hosted both other teams' away pairs and each away
  pair has visited both other home tables. All three teams play the full (even)
  board set; the comparison spans both halves. **(Q12)** the exact half-1/half-2
  away-pair rotation (which 3-cycle each half uses) must be specified so the
  reconstruction can detect it and so no team meets the same opponent twice
  within the triple.
- **Long triple (two rounds):** the three-way is spread across two normal
  rounds. With three pairings and two rounds, the exact mapping of pairings (and
  which tables host which half of the three-way) to round R vs round R+1 must be
  specified — **(Q13)**. Movement each round is the normal between-rounds move
  (no mid-round switch). Honour stationary pairs: if one of the three has a
  stationary constraint it should keep its home seat; otherwise deterministic.

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

- **Traveller:** the team-framed card already renders a three-way; it needs to
  handle a short triple's two half-matches and a long triple's two rounds. Each
  physical table row stays independently selectable for director override.
- **Leaderboard:** must credit a short triple as one normal round's VP, and a
  long triple as one round's VP in each of its two rounds (no double-counting).
  No average/compensation credit is involved for teams.
- **USEBIO:** today a triangle exports as three pairwise `<MATCH>` nodes sharing
  one round (`triangleSubMatches`). Short/long change the round(s) and boards, so
  the export mapping needs revisiting (Q8).

## 9. Migration / compatibility

- The existing `oddHandling: "TRIANGLE"` value and the one-round three-table
  behaviour are **removed/replaced**. Any persisted games using it (test
  fixtures, in-flight events) break — acceptable pre-release (Q9), confirm.
- The stale `swissTeamsSpecSchema` docstring claiming TRIANGLE "is rejected at
  start" is already wrong (it is implemented today); rewritten by this work.

## 10. Scope summary (teams)

1. Spec/schema — `oddHandling: "BYE" | "TRIPLE"` + `oddRoundPlan`
   (`"BYE" | "SHORT" | "LONG"`) on `swissTeamsSpecSchema`.
2. Setup UI — odd-field per-round plan builder in `SwissTeamsSetupDialog`.
3. Draw engine — short/long triple selection + layout; long-triple two-round
   handling (`swiss-teams-pairing.ts`).
4. Board maths + materialization — half-round split (short) and two-round span
   (long); board allocation (`materialize-swiss-teams-round.ts`).
5. Scoring — reuse the three-way comparison (no compensation: every team plays
   all boards). Short triple scores as one normal round; long triple credits
   each of its two matches to its own round (teams VP/agg/BAM/PAB).
6. Seating/movement — midpoint away-pair switch (short); normal between-rounds
   move (long). No timer changes.
7. Traveller / leaderboard / USEBIO — render and export short/long triples.
8. Remove the current one-round three-table triangle.

## 11. Open questions

Resolved: Q1 (per-round `oddRoundPlan`); Q2 (never replay a board; halves/round
ranges); Q3 (**no unplayed-board compensation for teams** — every team plays all
its boards; short triple scores as one normal round, long triple per round);
Q4 (long triple credited per round, not aggregated); Q5 (don't touch the timer);
Q7 (declared rounds = playing periods, long triple consumes two). The pairs-style
"anchor" concept does **not** apply to teams, so the earlier anchor question is
dropped for this document.

Still open:

- **Q8** USEBIO mapping for short/long triples (three pairwise `<MATCH>` nodes as
  today, but on which round(s)/boards?).
- **Q9** Confirm breaking any existing `oddHandling: "TRIANGLE"` games
  (pre-release — likely fine).
- **Q10** Confirm BYE / SHORT / LONG can be freely mixed in `oddRoundPlan`, the
  only constraint being LONG entries come in adjacent pairs.
- **Q12** Short triple: the exact half-1/half-2 away-pair rotation (which 3-cycle
  each half uses), so the reconstruction can detect it and no team meets the same
  opponent twice within the triple.
- **Q13** Long triple: how the three-way's pairings/tables map across the two
  rounds (R vs R+1).
