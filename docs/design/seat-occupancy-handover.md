# Seat occupancy as a first-class entity (stand-by → real-pair handover) — design

Status: **proposed** (not committed code). Supersedes the earlier *sidecar*
version of this document. Covers EBU White Book §2.3.3 / §2.4.7 — the
mid-session **stand-by → real-pair handover** that
`docs/design/withdrawals-late-arrivals.md` §9 deliberately deferred.

This is a deliberate **identity-layer refactor**. The user has explicitly
authorised a large, system-wide change on the grounds that the codebase is not
yet live ("change whatever you think will lead to the cleanest design"). So
rather than bolt a sidecar onto the existing single-participant-per-seat model,
we make **seat occupancy the primary entity** and let everything else derive
from it.

Source of truth for the rules: `docs/reference/ebu-white-book-scoring.md`
§6.1 ("without standing", §2.4.9), §6.5 (score to a late/missing contestant,
§2.4.6) and §6.6 (late arrival + stand-bys, §2.3.3/§2.4.7).

---

## 1. The scenario and the exact rule

A pair is missing at the start (or drops out mid-session). A **stand-by /
substitute** sits in and plays some boards. Later the **real pair** arrives in
time to play the rest and reclaims the seat.

The White Book is explicit — and this is **NOT a credit transfer** from the
stand-in to the real pair:

- **The stand-in's boards are scored "without standing" (§2.4.9 / §6.1):** the
  stand-in's results **count in full for its opponents**, but **do not count for
  the stand-in itself**, and the stand-in does **not appear in the ranking**.
  Those boards accrue to **nobody** in the standings.
- **The real pair is a late arrival (§2.4.7 / §6.6):** on arrival it becomes the
  seat's standing contestant. It keeps standing if it plays at least **half**
  the event's boards; its **unplayed (pre-arrival) boards are scored per §2.4.6**
  — **AVE−** (or Swiss §3.3.9 void), **not** the stand-in's actual results.

Faithful outcome: **sub boards → opponents only; real-pair early boards → AVE−;
real-pair own boards → count normally.**

### Why the current model cannot represent this

Today a seat is exactly one `participants` row with exactly one `standing`.
Those two facts are glued together: "the pair here" and "how this seat's boards
are credited" cannot diverge across the session. A handover needs **two
different occupants, each with their own standing, over disjoint board sets of
the same seat.** No single-row-per-seat value scores it correctly — both
director workarounds (`WITHOUT_STANDING` all session, or `ACTIVE`) mis-credit
the real pair (§7).

---

## 2. The clean model: occupancy is primary

### 2.1 The idea

A **seat** is just a slot in a movement (`A3NS`). It is no longer an identity —
it carries no players, no standing, no secret. The real entity is a **seat
occupancy**:

> *A seat occupancy records that a particular pair occupied a particular seat,
> over a particular set of boards, with a particular standing.*

```ts
// seat_occupancy  (per-game `games` db)   — THE primary participant entity
id:                   int   // surrogate PK (autoincrement)
seat:                 text  // movement position, section-qualified: "A3NS"
boards:               text  // JSON array of the board numbers this occupant played
                            //   null / absent = "all of this seat's boards"
                            //   (the whole-event common case)
player1:              int   // FK players.id
player2:              int   // FK players.id   (nullable: half table / phantom)
secretKey:            text  // device auth for THIS occupant of THIS seat
standing:             text  // "ACTIVE" | "WITHDRAWN" | "WITHOUT_STANDING" | "LATE"
withdrawnInRound:     int   | null
withdrawalTreatment:  text  | null   // "REMOVE" | "PENALISED"
withdrawalFinePercent:int   | null
// invariant: the `boards` sets of the occupancies for one seat are disjoint,
//            so every board resolves to exactly one occupant.
```

**Boards are an explicit set, not a contiguous range.** Board numbers are not
monotonic with play order — a stand-in can play boards 25–27 and then wrap to
1–3 within one physical stretch at the table. A `boardStart..boardEnd` span
cannot express that, so each occupancy stores the **set of board numbers** it
covers. This also matches how the rest of the withdrawal / late code already
reasons about played-vs-unplayed (from a *set* of board rows), so it stays
consistent with the existing scoring passes.

The crucial simplification stands: **the common case is exactly one occupancy
per seat**, covering all of that seat's boards (`boards = null`, meaning "every
board this seat plays"). A handover is simply **two** occupancies on the same
seat with disjoint board sets (which need not be contiguous). "Who played board N at seat S?" becomes **one
uniform lookup** for every game, ordinary or not — not a special case layered on
top of a base case.

This is the opposite of the sidecar. The sidecar kept `participants` as the base
truth and described exceptions beside it (two sources of truth, an implicit
"real pair owns the gaps" rule). Here there is **one** source of truth and the
ordinary game is just its degenerate single-row form.

### 2.2 `assignments` is subsumed and removed

The reconnaissance (the context-gather map) showed `assignments` is a thin
indirection: `boards.ns/ew` holds an assignment id; `assignments.initialSeat`
maps that id back to a round-1 home seat; the row's only load-bearing job is the
**Swiss/teams anchor-id → round-1-seat** mapping (for static movements the
assignment id, `initialSeat`, and `boards.ns/ew` are literally the same string).

A board-scoped occupancy row keyed by seat **is** that mapping — the anchor id
*is* a seat, and the occupancy says which pair sat at that seat for which boards.
So `assignments` collapses into `seat_occupancy` entirely. This is the single
clearest structural win of the refactor: one fewer indirection in the identity
chain, and the Swiss "id stays stable while the pair physically moves" rule is
expressed directly as "this occupancy owns this anchor seat for these boards."

New identity chain:

```
boards.ns / boards.ew   (anchor seat id, e.g. "A3NS")
        │
        └──▶  seat_occupancy  (seat + board set → players, standing, secret)
                      │
                      └──▶  players
```

`participants` as a table also goes away in its current form — its columns
(player1/2, secretKey, standing, withdrawal fields, the player-pair uniqueness)
all move onto `seat_occupancy`. What was "the participant at seat S" becomes
"the occupancy of seat S covering board N" (and for the ordinary whole-event
single occupancy, that's just "the occupancy of seat S").

### 2.3 How a board resolves to an occupant

For board `b` at seat `s`: find the single `seat_occupancy` row for `s` whose
`boards` set contains `b` (a row with `boards = null` covers every board the
seat plays). That row is the occupant — its players, its standing, its secret.
The disjoint-set invariant guarantees exactly one match. Ordinary games have one
`boards = null` row, so every board resolves to it.

---

## 3. Blast radius — every reader, and its change

The identity layer touches a lot. The table below is the full reader list from
the coupling map, ordered by impact. The unifying change is the same everywhere:
**"the participant at seat S" → "the occupancy of seat S [covering board N]".**
For the ordinary single-occupancy game every one of these is behaviourally
identical to today.

| # | Reader | File(s) | Change |
|---|---|---|---|
| 1 | Standing resolution | `ranking-exclusions.ts` (`readParticipantStandings`, `resolveStandings`, `readRankingExclusions`, `readWithdrawals`) | key standing on **(seat, board set)** not seat. For single-occupancy seats this is unchanged. For a handover, the sub's boards resolve `WITHOUT_STANDING`, the real pair's boards resolve its own standing. |
| 2 | Board-pooled scoring | `leaderboard-service.ts` (`scoreBoardsToOverall`, `toParticipant`, `swissSitOutScoredBoards`, `withdrawalCreditBoards`, `computeCombined`/`computeSections`, `splitByDirection`; Swiss VP + teams scorers) | lines keyed by seat id become keyed by **occupancy**. A sub-covered board is credited to opponents only via a synthetic per-board id (`A3NS#<occId>`) that has no ranked occupancy, so it drops from ranking naturally; the real pair's gap boards feed the existing `withdrawalCreditBoards` AVE− pass. |
| 3 | Board → names | `assignment-players.ts` (`buildAssignmentPlayerLookup`) → folded into occupancy; `schedule-service.ts` (`getSchedule`, `findAssignment`, `findPairBoards`, `tablePlayersFor`); `board-service.ts` (`getBoardInstances` `pairNameMap`, `buildTeamTravellerMatches`) | board-aware name lookup: seat + board → occupancy players. `schedule-service` already walks round-by-round so it is naturally occupancy-ready. |
| 4 | Auth / seat ownership | `find-participant-secret.ts`, `participant-auth.ts` (`validatePlayerToken`, `assertPlayer`), `submit-result.handler.ts`, deal-submit / leave-table / seat-transfer handlers, `rotate-participant-secret.ts` | secret moves onto the occupancy. Resolve "the occupant of board N at seat S" to authorise. Seat-transfer claim rotates **that occupancy's** secret. |
| 5 | USEBIO export | `usebio-service.ts` (`generateMpPairsUsebio`, assemble-* modules) | pair numbers derive from the seat / anchor id as today; a without-standing occupancy is omitted from the ranking exactly like any excluded id, mirroring the live board. |
| 6 | National-id dedupe | `find-seated-national-ids.ts`, create-participant dedupe | read ids from occupancies (all of them, including subs) instead of participants. |
| 7 | Teams | `find-teams.ts` (`deriveTeamId`), teams scorers in `leaderboard-service.ts` | team id stays home-NS seat; a team is still grouped by section|table from occupancies. Team standing remains whole-team (pairs-only handover in v1). |
| 8 | Occupancy-agnostic (just "the set of seated pairs") | `find-pairs.ts` `findPairs`, `highest-occupied-table.ts`, `participant-broadcast.ts`, `start-game-service.ts` seat grouping, `expected-late-seats.ts` | read occupancies instead of participants; for ordinary games the set is identical. |

Supporting pieces that also move:
- **Writers**: `create-pair-with-players.ts` (insert players + **one whole-event
  occupancy** instead of a participants row), create-participant handler
  (mint `secretKey` onto the occupancy), `withdraw-participant.ts`.
- **Materialisers**: `materialize-movement.ts`, `materialize-swiss-round.ts`
  (`swissPairMovementId` anchoring), `materialize-swiss-teams-round.ts` — these
  write `boards.ns/ew` and are unaffected in shape (they still emit anchor seat
  ids); they stop needing the `assignments` write entirely.
- **Model types**: `model/participants.ts` — `Pair`/`ParticipantStanding`/
  `AssignedPair` grow a notion of a board set (optional; absent = whole seat).
  `find-pair-for-player-id.ts` is likely dead — verify and delete.

**Board rows never change.** They keep their anchor `ns`/`ew`, materialised once
at start. Everything above is derived at read/score time from `seat_occupancy`,
exactly like the existing standing work.

---

## 4. Scoring, precisely

For a seat with two occupancies — here a simple split (sub = boards {1–6},
real pair = {7–24}; 24-board MP pairs event, half = 12). The same logic handles a
non-contiguous sub set like {25,26,27,1,2,3}, since each occupancy carries an
explicit board set rather than a span:

- **Sub (boards 1–6) plays "without standing."** The result stands on each board
  so opponents are matchpointed against a full field, but the sub's occupancy
  carries a synthetic ranked id (`A3NS#<occId>`) with no ranked line, so it
  drops from the ranking — the same "real seat id, no ranked participant"
  pattern the expected-late work used, now per occupancy.
- **Real pair's early boards (1–6) are its UNPLAYED boards** → fed to
  `withdrawalCreditBoards` (pairs) / `applyTeamWithdrawalRulings` (teams) as
  AVE− (PENALISED default; REMOVE would wrongly drop the real pair), subject to
  the §2.4.7 half-boards retain-standing test already implemented.
- **Real pair's own boards (7–24)** score normally.
- Real pair played 18 ≥ 12 → **retains standing**; ranked on 18 real + 6 AVE−.

The one genuinely new scoring primitive is the **per-occupancy synthetic id** so
the same seat can be unranked on some boards and ranked on others. This replaces
the sidecar's "make `applyRankingExclusion` board-aware" hack with a cleaner
"each occupancy is its own identity in the scored field" — which falls straight
out of occupancy-as-primary.

---

## 5. Migration

One schema change, mechanical data move:

1. Create `seat_occupancy` (above). Keep `players`, `boards`, `teams`,
   `expected_late_seats` as-is.
2. For every existing `participants` row, synthesise **one** occupancy:
   `seat = initialSeat`, `boards = null` (covers all of this seat's boards),
   copy `player1/2`, `secretKey`, `standing`, withdrawal columns.
3. Drop `assignments` and `participants`.

Because every current game maps to exactly one whole-seat (`boards = null`)
occupancy, the migration is lossless and every existing game reads back
identically. New games write the same single-occupancy shape at create time.
`boards = null` sidesteps needing the event's highest board at migration time —
"all of this seat's boards" is resolved from the `boards` rows when read.

(There is one games schema and a per-game DB migrated at creation via
`drizzle.config.games.ts`; generate with `npm run generate_games_migration`.
This will be migration `0009`.)

---

## 6. Director UX

On the Tables screen (mid-game), a seat gets a **"Hand over to real pair"**
action:
1. Confirm / record the **stand-in's names** and the **boards they played**
   (defaults to "up to now") → closes the sub's occupancy at the current board.
2. Seat the **real pair** → opens a new occupancy from the next board to the end,
   minting a fresh secret for the arriving pair's device.

The symmetric case (sub present from the start, real pair arrives) is the same
action. Multiple handovers at one seat are just more occupancy rows — no special
handling.

---

## 7. Decisions (resolved) and remaining open questions

**Resolved:**

- **A. Board coverage is an explicit SET of board numbers, not a contiguous
  range.** Boards are not monotonic with play order (a sub can play 25–27 then
  wrap to 1–3), so a span can't express real coverage. `boards` is a JSON array;
  `null` means "all of this seat's boards" (the common whole-event case). (§2.1)
- **B. Pairs only in v1.** Teams handover is deferred — a team sub is one pair of
  a four and needs separate modelling. Matches the expected-late scope.
- **E. `highestBoard` is derived from the `boards` rows, not stored.** `boards =
  null` means the migration never needs the number, and reads resolve "all of
  this seat's boards" from the materialised board rows. No schema column added.

**Still open:**

- **C. National-id dedupe semantics.** Should a sub's players be dedupe-checked
  against seated players, given they may be transient? Lean: yes, read all
  occupancies, but allow the same person to appear in disjoint board sets at the
  same seat.
- **D. USEBIO.** Confirm the published file omits without-standing occupancies
  and matches the live ranking.

---

## 8. Build order (reviewable slices)

Each slice is independently testable; the suite must stay green after each.

1. **Table + migration + writers (inert).** Add `seat_occupancy`, migrate
   existing participants → one whole-event occupancy, repoint create/materialise
   writers. Drop `assignments`/`participants`. Everything still single-occupancy,
   so behaviour is unchanged — this is the big mechanical slice, verified by the
   existing suite passing unchanged.
2. **Board-aware name lookup.** Fold `buildAssignmentPlayerLookup` into an
   occupancy lookup; schedule / traveller / board-service read it. Still inert
   (one occupancy), still green.
3. **Per-board scoring attribution.** Synthetic per-occupancy ranked id;
   without-standing sub boards → opponents only; real-pair gap → AVE− via the
   existing withdrawal pass. New tests cover a two-occupancy seat.
4. **Auth on occupancy.** Secret + seat-transfer rotation resolve per occupant.
5. **Director handover UX.** The Tables-screen action that writes the second
   occupancy.

---

## 9. Why this over the sidecar

The sidecar (previous version of this doc) kept `participants` primary and
described handovers as exceptions beside it. That meant two sources of truth, an
implicit "real pair owns the uncovered gaps" rule, and a per-board exclusion hack
bolted onto `applyRankingExclusion`. It was honest about being **blast-radius
avoidance**, not the model you'd choose from scratch.

The clean model makes occupancy the one identity. The ordinary game is its
single-row degenerate case, so there is no "base case + exceptions" split: every
board resolves the same way. It also lets `assignments` disappear, removing an
indirection from the identity chain. The cost is a wider one-time refactor
(every reader in §3), which the user has authorised precisely because the
codebase is not yet live.
