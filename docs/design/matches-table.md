# Design: a first-class `matches` table

**Status:** IMPLEMENTED (universal-structure model)
**Author:** —
**Scope:** per-game `games` database; all movements (pairs, teams, Swiss); the
traveller, USEBIO, the live-update layer, and match-level director rulings.

> **Implementation note.** This design has been fully implemented. `matches` is
> authoritative for match structure and rulings; `boards.matchId` links every
> board to its match; the triple-detection / anchor-recovery heuristics are
> deleted; and the match-level rulings (`VOID:` / `VOIDP:` / `MM:`) live on
> `matches.ruling` (the `boards.match_ruling` column and the `VOID_MATCH` /
> `VOID_PAIR` / `MISMATCH` board statuses were removed, migrations `0005`/`0006`).
> The remaining text below is the original proposal, kept for the rationale and
> the blast-radius map; two deliberate deviations from it:
>
> 1. **`getBoardInstances` (pairs traveller) was left as a board read**, not a
>    match join — a pairs board's `ns`/`ew` already ARE the participants, so the
>    join would add a query for no behavioural gain. The traveller unification
>    (§2.1/§6.2) still lands for teams, which dropped its bespoke seat-parsing
>    reducer.
> 2. **The §3.3.9 "removed board" (`TRM:`) stays per-board** (`REMOVED_TEAMS`
>    status) as planned (§6.3) — it is a per-board indemnity, not a match ruling.

---

## 1. Summary

Today the app has **no match entity**. A "match" — the pairs seated at one
table for a round, a teams open+closed-room encounter, a triple comparison, a
2-half-matches group, or a bye — is always **reconstructed on demand from the
`boards` table**. The draw/materialise step already knows the full structure,
flattens it into board rows, and then code across the Swiss/teams surface pays
to re-derive it. The hardest, most-bug-prone code in this area exists only to
perform that reconstruction.

This document proposes a **universal** `matches` table: one row per committed
match in every movement, with every board carrying a `matchId`. A match is a
**structural / seating** record — "which participants met over which boards in
which round" — and carries any match-level director ruling. Crucially, whether a
match is *scored as a unit* is a **property of the format** (teams/Swiss: yes;
matchpoint/cross-IMP pairs: no — the field is the scoring unit). `matches`
becomes authoritative for match **structure and rulings**; `boards` keeps only
per-board **results**. The derivation code is then deleted, not kept as a
fallback.

The code is **not yet live**, so there are no existing game databases to
migrate — we can adopt the new model cleanly.

---

## 2. Motivation

### 2.1 The structure is thrown away and re-derived

The write path already holds everything:

- `commitNextSwissRound` has `seating`, `sitOutPairId`, and the `halfMatch`
  group (anchor + two opponents + seat).
- `commitNextSwissTeamsRound` has `matches`, `byeTeamId`, and the `triple`
  (SHORT/LONG kind + slot).
- The static materialiser (`buildSectionRows`) has each table's `(ns, ew)`
  seating per round directly from the movement generator.

All of it is flattened into board rows, then reconstructed afterwards by
multiple readers. We discard structure we have, then pay to guess it back.

### 2.2 The re-derivation is where the fragile code lives

| Derivation | Lives in | Why it is fragile |
|---|---|---|
| Triple detection (SHORT = a table with ≥2 opponents; LONG = merge two consecutive non-mutual 3-cycles for one trio) | `detectTriples` (`src/scoring/swiss/team-match.ts`) | Pure structural inference, no stored flag; the subtlest logic in the codebase |
| Half-match **anchor** recovery ("faced two different opponents at one table in one round") | **duplicated** in `getSwissBoardHistory` (`swiss-board-history.ts`) and `getSwissCommittedRound` (`swiss-committed-seating.ts`) | A real bug already hit here — the per-table vs per-(table,pair) keying mistake |
| Match-level rulings smeared as tokens across **every** board row of the match | `set-board-result.ts` writers; read by `matchVoidCause`, `matchMismatch`, `creditMismatch`, `voidPairRounds` | Home-relative side inversion + dedup-across-rows; a ruling has no single home |
| A **second, independent** teams-match reducer | `board-service.buildTeamTravellerMatches` (does not reuse `groupTeamMatches`) | Classic duplicate-derivation drift risk |
| Per-table pairing for the traveller ("who played whom") | `board-service.getBoardInstances` (pairs) + `buildTeamTravellerMatches` (teams) | Two separate reducers for the same question |

### 2.3 A match row is the natural home for whole-table / whole-round rulings

Even where a match is **not** a scoring unit (matchpoint pairs), it is still the
right granularity for several director actions that today require touching every
board row of a table:

- **Accidental arrow-switch of a whole table/round** — every board's NS/EW
  result at that table is swapped as a unit. With a match row (which names the
  seats and board range) this is one operation keyed on the match, not a sweep
  across board rows. *(Primary motivator for going universal.)*
- A whole-table **adjusted score** or **cancel/foul** that spans the match's
  boards.
- Carrying a ruling that is conceptually "about this encounter" rather than
  "about this one board".

### 2.4 Features that get simpler if we do this first

- **Triple mismatch detection (F21 "Part B")** — DONE. Detecting a §3.5 mismatch
  inside a triple is now "compare match rows", not "infer the triple then infer
  the comparison": a triple's three comparisons are first-class `matches` rows,
  so detection replays the trio selection and diffs membership, the ruling is
  keyed to one comparison by its board, and the scorer applies the §3.5.2
  adjustment on that comparison's own 10/20-VP pool.
- **Withdrawals / late arrivals (F24 / F25)** — fundamentally match-level
  (a match cancelled, replayed, or scored against a withdrawn contestant); a
  match row is the natural carrier.

---

## 3. The invariant

> **A `match` is the authoritative record of match STRUCTURE (which participants
> met, over which boards, in which round) and any match-level RULING. Every
> board belongs to exactly one match (`boards.matchId`). `boards` holds only
> per-board RESULTS. Code reads `matches` for structure/seating and never
> re-infers it from board seatings.**
>
> **Whether a match is *scored as a unit* is a property of the format, recorded
> on the match's `kind`/`scoredAsUnit`: teams/Swiss encounters, triple
> comparisons and half-matches ARE scored as a unit; ordinary matchpoint /
> cross-IMP pairs matches are NOT — the section field is the scoring unit, and
> the pairs scorers continue to score board rows field-wide and ignore the match
> as a scoring boundary.**

Two things this makes explicit, so no read site has to guess:

1. **Structure is always a match row** (uniform write path, uniform traveller,
   uniform "who played whom"). A static-pairs match row is real and useful for
   seating, rulings, and the traveller — it is simply not a *scoring* boundary.
2. **Scoring-as-a-unit is format-specific**, and named on the row, so "is this
   match load-bearing for scoring here?" is a field lookup, not an implicit
   convention. Pairs field scoring reads boards, not matches; it never mistakes
   the match row for a scoring unit.

A half-migration (table exists but scorers still reduce boards "to be safe")
would be the worst outcome: two sources of truth that can silently diverge. The
simplification only lands if the structure-derivation code is **removed**.

Corollary: match-level rulings (`VOID:` / `VOIDP:` / `MM:` and their statuses,
and the `boards.matchRuling` column) **leave `boards` entirely** and move to
`matches.ruling`. The `REMOVED_TEAMS` `TRM:` token is per-board (a removed board
within a match), so it stays on `boards` — see §6.3.

---

## 4. Universal, but scored-as-a-unit only sometimes

`matches` is **universal in structure** — every movement writes match rows and
every board has a `matchId`. The payoff differs by format, and that is captured
by `scoredAsUnit`:

| Movement family | Match rows (structure) | Scored as a unit? | Where the match row earns its keep |
|---|---|---|---|
| Swiss Teams | Yes | **Yes** (margin→VP per match; triples; byes) | Scoring + traveller + USEBIO + draw history + rulings |
| Round Robin Teams | Yes | **Yes** | Scoring + traveller + USEBIO |
| Swiss Pairs | Yes | **Yes** (per-round VP; half-matches; byes) | Scoring + draw history + §3.5 detection + rulings |
| Mitchell / Howell / American Whist (static pairs) | Yes | **No** (field-scored) | Traveller ("who played whom") + whole-table rulings (arrow-switch, cancel) + uniform model. Scoring ignores it. |

So the match row is universal for **seating, the traveller, and rulings**;
**scoring** consults it only when `scoredAsUnit` is true. This is the shift from
the earlier draft, motivated by (a) the arrow-switch class of whole-table
ruling (§2.3) and (b) unifying the traveller's "who played whom" into one
read instead of two reducers.

Written by: the two **Swiss draw commits**, the **teams materialiser**, and the
generic static **`buildSectionRows`** (now also emits match rows).

---

## 5. Proposed schema

One row per committed match in a round, for every movement; every board gains a
`matchId`. (Shape, not final DDL.)

```ts
// src/db/games/tables/matches.ts
export const matches = sqliteTable("matches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  section: text("section").notNull(),
  roundNumber: integer("round_number").notNull(),

  // What kind of encounter this row represents.
  kind: text("kind", {
    enum: [
      "PAIRS",            // ordinary pairs seated at one table (any pairs movement)
      "TEAMS",            // teams ordinary two-room encounter
      "TRIPLE",           // one comparison of a 3-way (teams)
      "HALF_MATCH",       // a Swiss Pairs 2-half-matches comparison
      "BYE",              // sit-out (one participant, no opponent)
    ],
  }).notNull(),

  // Whether SCORING treats this match as a unit (teams/Swiss) or whether the
  // section field is the scoring unit (matchpoint/cross-IMP pairs). The pairs
  // scorers ignore the match row entirely when this is false.
  scoredAsUnit: integer("scored_as_unit", { mode: "boolean" }).notNull(),

  // Participants as stable home-seat ids (e.g. "A1NS") — the SAME ids
  // findPairs/findTeams produce. `opponent` is null for a BYE.
  home: text("home").notNull(),
  opponent: text("opponent"),

  // Grouping for multi-comparison structures.
  groupId: text("group_id"),   // half-match group / triple group key
  slot: integer("slot"),       // triple slot (1/2) or comparison index

  // Scoring hints currently re-derived (meaningful when scoredAsUnit).
  vpPool: integer("vp_pool"),            // 20 ordinary, 10 triple-SHORT / half …
  boardStart: integer("board_start").notNull(),
  boardEnd: integer("board_end").notNull(),

  // The match-level director ruling (replaces the smeared board tokens).
  // One of VOID:<cause> | VOIDP:<cause> | MM:<side>:<dir>:<fault> | null.
  ruling: text("ruling"),
}, (t) => ({
  byRound: index("matches_section_round_idx").on(t.section, t.roundNumber),
}));
```

And on `boards`:

```ts
// src/db/games/tables/boards.ts (added)
matchId: integer("match_id").notNull().references(() => matches.id),
```

Notes:
- `boards.matchId` makes "which match does this board belong to" a foreign key,
  not a seat-parse + group-by. The traveller's per-table pairing becomes a join
  for pairs **and** teams — one path.
- Participants reference the same seat/team ids as `assignments` / `findTeams`;
  the match row **complements** the identity layer, it does not duplicate it.
- `kind` + `groupId` make triples and half-match groups explicit rows, retiring
  `detectTriples` and the anchor heuristic.
- `scoredAsUnit` names the format fact (§3) so no reader guesses. Derivable from
  `kind` + the game's scoring type, but stored for a cheap, unambiguous read.
- `ruling` gives match-level director rulings a single home (§6.3).

---

## 6. Blast radius

Labelled **SIMPLIFIED**, **UNCHANGED**, or **NEWLY COUPLED**.

### 6.1 Write path — NEWLY COUPLED (cheap; structure already in hand)

- `src/services/materialize-movement.ts` (`buildSectionRows`) — now also emits a
  `matches` row per table-round (kind `PAIRS`, `scoredAsUnit:false` for a
  matchpoint/XIMP pairs game) and stamps `matchId` on each board row. The
  seating is already in hand per table-round; this is a mechanical addition.
- `src/services/draw-swiss-round-service.ts` (`commitNextSwissRound`) — writes
  `matches` rows (PAIRS/HALF_MATCH/BYE, `scoredAsUnit:true`) + `matchId` on
  boards, in the same transaction. Already has `seating`, `sitOutPairId`,
  `halfMatch`.
- `src/services/draw-swiss-teams-round-service.ts` /
  `materialize-swiss-teams-round.ts` — writes `matches` rows (TEAMS / TRIPLE
  comparisons / BYE) + `matchId`. Already has `matches`, `byeTeamId`, `triple`.
- Round Robin Teams materialisation — writes match rows up front.
- Idempotency guards per round stay; the match insert sits inside the same
  transaction as the board insert everywhere.

### 6.2 Read path — SIMPLIFIED

- `src/scoring/swiss/team-match.ts` — `groupTeamMatches`, `groupTeamTriples`,
  `detectTriples`, `tripleTeamStakes`, `matchVoidCause`, `matchMismatch`,
  `teamByeRounds` → replaced by reads of `matches`. **`detectTriples` and its
  SHORT/LONG inference are deleted.**
- `src/scoring/swiss/swiss-vp-round.ts` — the head-to-head half enumeration
  (`buildMatches` / `segmentsForPair`) and `creditMismatch` / `voidPairRounds`
  read `matches` for structure + ruling instead of re-splitting rows.
- `src/scoring/swiss/swiss-half-match.ts` — the structural half-match
  re-splitter shrinks (the group is now a row); the AVE-fraction math stays.
- Overall scorers `teams-vp-overall.ts`, `teams-board-comparison-overall.ts`,
  `swiss-mp-vp-overall.ts`, `swiss-ximp-vp-overall.ts` — consume the above.
- DB queries `swiss-board-history.ts`, `swiss-committed-seating.ts`,
  `swiss-teams-committed.ts` — `playedOpponents` / `hadBye` / `hadHalfMatch` /
  `hadTriple` and the committed-opponent readers become `SELECT`s over
  `matches`. The duplicated anchor heuristic is deleted.
- `src/services/board-service.ts` — **both** reducers simplify:
  `buildTeamTravellerMatches` is **deleted** (teams framing reads `matches`), and
  `getBoardInstances` joins each board to its match for the per-table pairing +
  participants rather than parsing seats. Pairs and teams share one path.
- USEBIO `assemble-swiss-teams.ts`, `assemble-board-comparison-teams.ts`,
  `assemble-imp-aggregate-teams.ts`, `assemble-swiss-pairs.ts` — the `MATCH`
  nodes map ~1:1 to `matches` rows; the board-row reconstruction + triple
  detection is removed.

### 6.3 Match-level rulings — SIMPLIFIED (storage moves off boards)

- `src/db/games/actions/set-board-result.ts` — `voidTeamsMatch`,
  `voidPairsMatch`, `markMismatch` stop stamping tokens across every board row;
  they write/clear `matches.ruling` on the one match row. Home-relative side
  inversion and the dedup-across-rows chore disappear. **New headroom:** a
  whole-table arrow-switch / cancel becomes a single match-level ruling instead
  of a sweep over board rows (§2.3).
- `src/db/games/types/board-status.ts` — `VOID_MATCH`, `VOID_PAIR`, `MISMATCH`
  statuses and the `boards.matchRuling` column are removed. The board's own
  result + ordinary statuses (`CONFIRMED`, `OVERRIDDEN`, `CANCELLED`, `SIT_OUT`,
  `HALF_AVERAGE`, `NOT_PLAYED`) stay.
- `REMOVED_TEAMS` + `TRM:` **stays on `boards`** — a removed board is a per-board
  §3.3.7 indemnity within a match, not a match-level ruling.

### 6.4 Live-update layer — NEWLY COUPLED

- `src/socket/handlers/results/broadcast-results.ts` — today a ruling change
  rides on a board-row change, so the existing per-board broadcast already
  revalidates. With rulings on `matches`, the ruling handlers must invoke
  `broadcastResultsChanged` (or a match-aware variant) on a **match-row** change,
  and `buildTravellerPayload` / `buildLeaderboards` read `matches`. Occupancy
  gating and the room model are **UNCHANGED**.

### 6.5 Pairs scoring — UNCHANGED (reads `scoredAsUnit:false` matches as nothing)

- **All pairs field scoring** — `scoring/traveller/pair/*`,
  `scoring/overall/pair/*`, `scoring/plugins/*`, Neuberg/matchpoint/cross-IMP.
  Still board-row driven; the match row exists but is not a scoring boundary and
  these never read it. This is the §3 invariant in practice: structure is a
  match row, but scoring-as-a-unit is false here, so the scorers are untouched.
- **Non-Swiss pairs USEBIO** (`generateMpPairsUsebio`) — emits per-board
  `TRAVELLER_LINE`s, no `MATCH` nodes. Unchanged (a matchpoint pairs file is
  board-scored, not match-scored).

### 6.6 UNCHANGED

- **Player board-entry + confirmation flow** (`usePlayFlow`,
  `submit-result.handler.ts`, `confirmBoardResult`, the
  `PENDING_CONFIRMATION`/`CONFIRMED` statuses). Strictly per-board-per-table:
  the dual-side confirm is between the two players at one table on one board,
  never across a match. A match row changes nothing here. (The board already
  carries `matchId` from materialisation; the submit path never writes it.)
- **The player-facing traveller rendering** (`Traveller.tsx`,
  `PerBoardTravellerView`, `TravellerContext`) — still plugin-driven, per-line;
  it consumes the payload, which is now sourced via the match join. Shape
  unchanged.
- **Identity layer** — `assignments`, `findPairs`, `findTeams`. A match row
  references the ids these produce; no duplication.

### 6.7 Touch-point summary

| Area | Effect |
|---|---|
| Swiss/teams `team-match.ts`, `swiss-vp-round.ts`, `swiss-half-match.ts` | SIMPLIFIED (delete `detectTriples`, anchor recovery, re-splitters) |
| Teams/Swiss USEBIO assemblers | SIMPLIFIED |
| `board-service` (`buildTeamTravellerMatches` **and** `getBoardInstances`) | SIMPLIFIED / unified (one match-join path for pairs + teams) |
| DB history/committed-round queries | SIMPLIFIED (→ `SELECT`) |
| Match-level ruling storage (`set-board-result`, statuses, `matchRuling`) | SIMPLIFIED (→ `matches.ruling`); unlocks whole-table rulings |
| All materialisers + draw commits (incl. static pairs) | NEWLY COUPLED (write match rows + `matchId`) |
| Broadcast layer (ruling changes) | NEWLY COUPLED |
| Pairs field scoring, non-Swiss USEBIO | UNCHANGED (ignore `scoredAsUnit:false` match) |
| Player submit/confirm, player traveller rendering, identity layer | UNCHANGED |

---

## 7. Migration & sequencing

No live data ⇒ no backfill, no read-fallback. Land it in reversible steps, each
green against the full suite (≈3900 unit + the int suite), rule: **behaviour
must not change**.

1. **Add `matches` + `boards.matchId`; write rows at every materialiser/commit
   (no readers yet).** Add a temporary test-only assertion that written rows
   equal what the current reducers derive (parity check). Fully reversible.
2. **Unify the traveller** — `getBoardInstances` + the teams framing read the
   match join; delete `buildTeamTravellerMatches`. (Does both formats at once —
   the first visible payoff.)
3. **Flip each Swiss/teams reader to `matches`, delete its derivation** — one
   module at a time (committed-round queries → scorers → USEBIO), suite green
   after each.
4. **Move rulings off `boards`** — rewrite the `set-board-result` ruling writers
   to `matches.ruling`; point `matchVoidCause`/`matchMismatch`/`creditMismatch`/
   `voidPairRounds` at the match row.
5. **Delete the dead code** — `detectTriples`, the anchor heuristics, the
   `VOID_MATCH`/`VOID_PAIR`/`MISMATCH` statuses + `boards.matchRuling` column,
   and the parity assertion from step 1.

---

## 8. Risks & trade-offs

- **Two sources of truth.** The headline risk. Mitigated by the invariant
  (§3) + the step-1 parity check + deleting the derivation so there is nothing
  to diverge *from* once migrated.
- **Large blast radius.** Most of the Swiss/teams surface plus the materialisers
  and the traveller. Mitigated by the per-module sequencing and the test wall.
- **Unused-row cost for static pairs.** A matchpoint pairs game writes match
  rows its scorer never reads. This is deliberate (§4): the rows pay for the
  traveller unification and whole-table rulings (arrow-switch), and `scoredAsUnit`
  keeps the scoring path honest about ignoring them. The write cost is one row
  per table-round — negligible on a single-appliance LAN.
- **The "is this match scored here?" question.** Answered by `scoredAsUnit`
  rather than left implicit — the explicit column is the mitigation for the main
  objection to going universal.
- **Director seating edits.** A hand-edited draw must update match rows + the
  boards' `matchId` too; the commit path owns this (writes both in one
  transaction) and the edit routes through the same commit.

---

## 9. Open questions

1. **`scoredAsUnit` stored vs. derived** from `kind` + scoring type.
   Recommendation: store it — cheap, unambiguous, and it is the invariant made
   explicit.
2. **Minimal schema (§5) vs. fuller.** Recommendation: minimal.
3. **Rulings leave `boards` entirely** (recommended, no live data) vs. a
   transitional dual-write. Recommendation: move cleanly.
4. **`BYE` as a `matches` row** vs. a `SIT_OUT` board only. Lean: yes, for a
   uniform `hadBye`/history read and a uniform `matchId` on every board.
5. **`boards.matchId` nullability.** With universal matches it can be
   `NOT NULL` (every board belongs to a match). Confirm no transient
   materialisation step writes a board before its match row (the single
   transaction should guarantee not).

---

## 10. Recommendation

Worth doing, as a **universal-structure** model: every board belongs to a match,
`matches` is authoritative for structure + rulings, and `scoredAsUnit` names
where scoring treats the match as a unit (teams/Swiss) vs. where the field is the
unit (matchpoint pairs). The code isn't live, so we get the clean version —
authoritative `matches`, derivation deleted.

Do it as a **standalone refactor** with the §3 invariant, and **before** triple
mismatch detection (F21 Part B) and withdrawals/late-arrivals (F24/F25), which
both become materially simpler once a match is a row. Going universal (rather
than teams/Swiss-only) buys a unified traveller and a natural home for
whole-table rulings such as a round-wide arrow-switch, at the cost of some
never-scored rows for static pairs — a trade the explicit `scoredAsUnit` keeps
safe.
