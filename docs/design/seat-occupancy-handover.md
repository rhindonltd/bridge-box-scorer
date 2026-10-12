# Seat occupancy as a first-class entity (stand-by → real-pair handover) — design

Status: **COMPLETE — all slices landed** (identity-layer refactor, per-board
scoring attribution including the general §4.1.1.1 AVE-valuation refactor,
occupant-aware auth, and the director handover UX; see §4a, §6 and §8).
Supersedes the earlier *sidecar* version of this document. Covers EBU White Book
§2.3.3 / §2.4.7 — the mid-session **stand-by → real-pair handover** that
`docs/design/withdrawals-late-arrivals.md` §9 deliberately deferred.

This is a deliberate **identity-layer refactor**. The user explicitly authorised
a large, system-wide change on the grounds that the codebase is not yet live
("change whatever you think will lead to the cleanest design"). So rather than
bolt a sidecar onto the existing single-participant-per-seat model, we make
**seat occupancy the primary entity** and let everything else derive from it.

> **What's built (slice 1).** `seat_occupancy` is the primary table;
> `participant` and `assignment` are gone; every reader/writer/auth path is
> repointed; the games migrations were collapsed to a single fresh baseline. All
> games still run with exactly one whole-seat occupancy per seat, so behaviour
> is unchanged. The one design point that differs from the first draft below is
> the **`anchorId`** column (§2.2): a board id is NOT always the physical seat,
> so the occupancy carries both.

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
seat:                 text  // PHYSICAL chair, section-qualified: "A3NS"
anchorId:             text  // the board id (boards.ns/ew) for this seat; see §2.2
                            //   null until materialisation stamps it
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
// unique(player1, player2) — one person occupies a single position.
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

### 2.2 `assignments` is subsumed — and why `anchorId` exists

`assignments` was a thin indirection: `boards.ns/ew` held an assignment id, and
`assignments.initialSeat` mapped that id back to a physical round-1 home seat.
The first draft of this doc assumed the id and the seat were "literally the same
string" and that `assignments` could therefore just evaporate.

**That assumption was wrong, and the build caught it.** The value on
`boards.ns/ew` — call it the **board id** or **anchor id** — equals the physical
seat only for a movement where a pair holds a fixed compass direction all event:
a **standard Mitchell with no arrow switch**. There the id genuinely is a
directional seat (`A1NS`), because NS pairs stay NS and EW pairs stay EW.

For every **direction-changing** movement the board id is a bare, direction-less
pair number instead — because a compass direction in the id would be meaningless
when the pair switches sides round to round:

- **Arrow-switch Mitchell** and **file-based / SPEC pairs & teams**: `A1`, `A6`…
- **Swiss Pairs**: the stable pair number (`A1`, `A5`…), anchored to where the
  pair sat down in round 1 (NS pairs `1..tables`, EW pairs `tables+1..2·tables`).
  The physical round-1 chair (`A1NS`) is a *separate* fact.

So a seat has two identities that coincide only in the fixed-direction Mitchell
case: the **physical chair** the director seats and the device authenticates on
(`seat`, always directional, e.g. `A1NS`), and the **board id** the movement
assigns and every board row / leaderboard line / match carries (`anchorId`,
directional only for fixed Mitchell, bare otherwise). `assignments` was the
bridge between them; the occupancy now carries both columns, so the bridge lives
on the one entity.

`anchorId` is written at a different time from `seat`: the occupancy is created
when the director seats a pair (pre-start), when only the physical chair is
known; materialisation then stamps `anchorId` from the round-1 layout (the same
seat→id mapping the old round-1 `assignment` rows recorded). Readers that join a
board row to its occupant use `anchorId` (falling back to `seat` when the two are
equal / not yet stamped); readers about the chair itself (auth, the director UI,
the ranked identity) use `seat`.

New identity chain:

```
boards.ns / boards.ew   (the board / anchor id — "A1NS" for fixed Mitchell,
        │                 bare "A1" for Swiss / arrow-switch / SPEC)
        └──▶  seat_occupancy  (matched on anchorId; carries the physical seat,
                      │         board set, players, standing, secret)
                      └──▶  players
```

`participants` as a table also goes away — its columns (player1/2, secretKey,
standing, withdrawal fields, the player-pair uniqueness) all move onto
`seat_occupancy`. What was "the participant at seat S" becomes "the occupancy
whose board set covers board N for the seat with that anchor" (and for the
ordinary whole-event single occupancy, that's just "the occupancy for that
seat").

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

## 4a. Slice-3 build (as implemented)

The §4 sketch's `A3NS#<occId>` id and "feed the real pair to the withdrawal
pass" are right in spirit, but the build pins down three things the sketch left
loose (confirmed by a full trace of the MP → overall path):

### Synthetic id — a parser-level suffix, not an ad-hoc string

A scored-field id is `<seat>` for the primary occupant and `<seat>#<occId>` for
a non-primary one. `#<occId>` is taught to the shared seat parser
(`model/participants.ts`): `SEAT_REGEX` gains an optional `(?:#(\d+))?`,
`parseSeat` returns an extra `occupancyId`, `formatPairNumber` preserves it, and
`scoredIdFor` / `baseSeatOf` build / strip it. The suffix lives ONLY on a
transient scored-field id in the ranking path; it is never persisted (board
rows, matches, `seat_occupancy.seat` carry the bare seat), so every DB-id
`parseSeat` caller is untouched (real ids never contain `#`). `splitByDirection`
and USEBIO keep working because the direction still parses.

### Injection — rewrite board-row ids up front, once

Rather than thread a resolver through every `compute*` signature,
`readLeaderboardInputs` rewrites each board row's `ns`/`ew` to its **occupant's**
scored-field id before scoring (`buildOccupantScoredIdResolver` over the
occupancies). For every ordinary game (0/1 occupancy per seat) this is the
identity, so the whole pipeline is byte-for-byte unchanged; only a handover seat
sees a `#<occId>` on the sub's boards. The sub's id is added to
`excludedFromRanking` (`nonPrimaryOccupantScoredIds`) — a no-participant id does
NOT drop by itself, so the exclusion is what unranks it (§2.4.9), exactly like
`WITHOUT_STANDING`.

### The real pair's gap — explicit unplayed set

After the rewrite the real pair's early rows carry the SUB's id, so there is no
row carrying the real pair's id on those boards for `withdrawalCreditBoards`'
`result == null` test to find. The real pair's `WithdrawalRecord` therefore
carries an explicit `unplayedBoards` set (= the boards its occupancy does NOT
cover), and the credit pass emits the real pair's AVE− on exactly those board
numbers. No opponent indemnity on the gap: the opponent already has a real
result against the sub, so no board was lost to it (unlike an ordinary
withdrawal or an empty-late seat).

### §4.1.1.1 for EVERY AVE award (general rule)

Previously only director artificial rulings got the §4.1.1.1 "better than
average" uplift (AVE+ → max(60%, own avg); AVE− → min(40%, own avg)); the
synthesised withdrawal / sit-out / empty-late credits were flat 60/40 — a latent
gap. Slice 3 generalises: **every** synthetic AVE credit is emitted as an
artificial-outcome (`A<ns>/<ew>`) line, and `applyBetterThanAverage` runs ONCE
over the real + synthetic set (reordered after synthesis, before the final
round). So the handover gap, ordinary withdrawals, sit-outs and empty-late all
get the uplift uniformly. A PENALISED fine (e.g. AVE−-minus-25%) is NOT an exact
AVE−, so the uplift leaves it alone — correct, a fined figure is the director's
deliberate value. IMP/XIMP have no per-board max, so §4.1.1.1 does not apply
there (unchanged, 0-net credits).

New MP ordering in `scoreBoardsToOverall`: score real → `equaliseMpBoards`
(real) → synthesise artificial-outcome AVE credits at the equalised top →
`applyBetterThanAverage` (real + synthetic) → `roundMpBoards` → aggregate.

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

**As shipped:** because the codebase is not yet live, the games migrations were
collapsed to a **single fresh baseline** (`drizzle/games/0000_*.sql`) that
creates `seat_occupancy` directly, rather than an incremental drop/create of the
old tables. There is one games schema and a per-game DB migrated at creation via
`drizzle.config.games.ts` (`npm run generate_games_migration`). No data-migration
step was needed since there is no production data to carry over.

---

## 6. Director UX (as built — slices 4 & 5)

On the Tables screen (post-start), a seated pair's per-table dialog
(`DirectorTableModal`) gains a **"Hand over to real pair"** action beside
"Change standing". It opens an inline form that collects only the **arriving
real pair's two names** and how their pre-arrival (unplayed) boards are
treated (REMOVE / PENALISED + 0..40% fine, mirroring the withdrawal form).

**The boards-played split is DERIVED, not entered.** The director does not pick
a cutoff. On submit, the server (`handoverSeat` action) reads the seat's board
rows and splits them by whether each board already carries a result (a director
override over the confirmed result — the same rule the scorer uses):

1. The stand-in's occupancy is pinned to the boards that **already have a
   result** and demoted to `WITHOUT_STANDING` — those boards score normally for
   its opponents (§2.4.9) and the stand-in drops from the ranking. Its
   withdrawal fields are cleared (a stand-in carries no fine).
2. The arriving real pair is inserted as a §2.4.7 `LATE` occupancy over the
   **remaining (unresolved) boards**, carrying the chosen treatment/fine, with
   fresh player rows and a freshly minted device secret (returned on the ack so
   the director can hand it to that pair's device).

So the handover is always "from the next board without a result" — no in-flight
board can be split across the two occupancies, and the two board sets are
disjoint and jointly cover the seat by construction. Because the primary pick is
semantic (`primaryOf` prefers the non-`WITHOUT_STANDING` occupant), demoting the
stand-in automatically makes the real pair the ranked primary; insert order is
irrelevant.

The action is director-authed (`assertDirector`), and — like a withdrawal — it
is a scored event, so it re-broadcasts PARTICIPANTS + a fresh leaderboard
snapshot. Auth after the handover resolves to the real pair: `findParticipantSecret`
and `rotateParticipantSecret` resolve the seat's **primary** occupant (slice 4),
so the stand-in's (now dead) secret cannot authenticate and a "change device"
transfer only rotates the active pair's secret.

**Guards (rejected, surfaced to the director):** no pair seated at the seat; the
seat already has more than one occupancy (v1 supports a single handover per
seat); every board of the seat already has a result (nothing left to hand over).

**v1 scope:** pairs only (decision B). National-id dedupe for the arriving pair
is limited to the "same EBU number for both players" check — the arriving pair
is NOT cross-checked against other seated players (open question C), because the
stand-in they replace still occupies the same seat as an occupancy; a full
cross-seat dedupe that excludes the same-seat stand-in is future work.

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

**Resolved since (slices 3–5):**

- **D. USEBIO.** Confirmed. The published file omits the without-standing
  stand-in from the placings while still declaring it as a `<PAIR>` (so its
  traveller lines reference a real pair), mirroring the live ranking. The one
  divergence — the real pair's gap AVE− is absent from the exported ranking
  because USEBIO re-scores with no AVE− synthesis — is documented in §8 slice 3
  and is a pre-existing leaderboard/USEBIO difference, out of scope.
- **F. Handover split point.** The boards-played split is DERIVED from entered
  results, not chosen by the director: the stand-in keeps every board with a
  result, the real pair takes the rest (§6). This is cleaner and less
  error-prone than a director-entered cutoff and cannot split an in-flight
  board.

**Still open (deferred, not blocking):**

- **C. National-id dedupe semantics.** v1 only rejects the same EBU number for
  the arriving pair's two players; it does NOT cross-check the arriving pair
  against other seated players. A full cross-seat dedupe that correctly excludes
  the same-seat stand-in (so replacing a sub isn't flagged as a clash with
  itself) is future work.

---

## 8. Build order (reviewable slices)

Each slice is independently testable; the suite must stay green after each.

1. **Table + migration + writers (inert). ✅ DONE.** Added `seat_occupancy`
   (with `anchorId`, §2.2), collapsed the games migrations to one baseline,
   repointed every create/materialise writer and reader/auth path, dropped
   `assignment`/`participant`. Everything is still single-occupancy, so
   behaviour is unchanged — verified by the full suite passing unchanged plus a
   green build. A follow-up change normalised the **Swiss board id to the bare
   pair number** (so only fixed-direction Mitchell keeps a directional id),
   which is what made `anchorId` necessary and now consistent across movements.
2. **Board-aware name lookup. ✅ (effectively done in slice 1.)**
   `buildAssignmentPlayerLookup` now keys on `anchorId ?? seat`, and
   `board-service` resolves traveller names through it; `schedule-service`
   resolves a seat's board rows via its `anchorId`. Still inert (one occupancy),
   still green. The remaining per-*board* resolution (vs per-seat) only matters
   once a seat has two occupancies — that is slice 3.
3. **Per-board scoring attribution. ✅ DONE.** The scored-field id carries a
   parser-level `#<occId>` suffix for a non-primary occupant (§4a); board rows
   are rewritten to the occupant id up front in `readLeaderboardInputs`; the
   stand-in's id is excluded from the ranking (counted for opponents only); the
   real pair's gap boards are scored AVE− via `handoverRealPairGaps` →
   `withdrawalCreditBoards` (no opponent indemnity on the gap). Landed together
   with the **general §4.1.1.1 AVE-valuation refactor** (§4a): every synthetic
   AVE+/AVE− award (withdrawal, sit-out, empty-late, handover gap) now flows
   through `applyBetterThanAverage` uniformly. Leaderboard + USEBIO tests cover a
   two-occupancy seat. **USEBIO caveat:** the stand-in is correctly exported
   (counted for opponents, no placing), but USEBIO re-scores independently and
   has no withdrawal/sit-out/handover AVE− synthesis, so the real pair's gap
   AVE− is absent from the exported ranking — exactly as an ordinary
   withdrawer's AVE− gap already is (a pre-existing USEBIO/leaderboard
   divergence, out of scope here).
4. **Auth on occupancy. ✅ DONE.** `findParticipantSecret` and
   `rotateParticipantSecret` resolve the seat's PRIMARY (current, active)
   occupant via `primaryOf` rather than an arbitrary / all rows: the lookup
   returns the active pair's secret and the rotation targets that occupancy's
   `id` alone. Per-*board* auth proved unnecessary — the stand-in and the real
   pair never occupy the seat at the same instant (the handover demotes the sub
   and seats the real pair in one step), so "current occupant" is a single
   unambiguous answer. The submit-result/auth signatures are unchanged
   (`boardNumber` stays out of the auth path).
5. **Director handover UX. ✅ DONE.** The Tables-screen "Hand over to real pair"
   action (post-start, in `DirectorTableModal`) → `game:handoverSeat` →
   `handoverSeat` DB action, which writes the second occupancy. The real pair is
   PRIMARY because `primaryOf` is semantic (the non-`WITHOUT_STANDING`
   occupant), so the action just demotes the stand-in and seats the arriving
   pair `LATE`; insert order does not matter. The boards-played split is DERIVED
   server-side from the entered results (the stand-in keeps every board with a
   result; the real pair takes the rest), so the director enters only the
   arriving pair's names + treatment — see §6.

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
