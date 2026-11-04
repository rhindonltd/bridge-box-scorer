# Fixed-device (device-stays-on-the-table) mode — design

Status: **PROPOSED — not started.** Scoping/design only; no code written. This
document captures the agreed product model and an engineering estimate for
adding a second way of running a session.

Related: `docs/design/seat-occupancy-handover.md` (the §2.4.7 substitution /
handover model this reuses), `docs/design/withdrawals-late-arrivals.md`
(the "expected late" seat handling this builds on).

---

## 1. The two session models

Today the app supports exactly ONE model:

- **Travelling-device (current, "the device follows the pair").** A device joins
  at a seat (`initialSeat`, e.g. `A4EW`) and that seat IS the pair's identity,
  the device's identity, and its auth key for the whole event. As the movement
  sends the pair from table to table, the device travels with them. "What should
  I show this device now?" is a forward-only walk of a single pair's schedule.

We want to add a SECOND model:

- **Fixed-device ("the device stays on the table").** A device is bound to a
  physical table position (table + direction, e.g. table 4 EW) for the WHOLE
  event and never moves. Each round, whoever the movement seats at that position
  sits down at the device and enters that round's boards for that table. For a
  moving direction (EW in a standard Mitchell) that is a DIFFERENT pair each
  round; for a stationary direction (NS) it is the same pair all event.

The two models are mutually exclusive for a given game: "the device follows the
pair" is meaningless when the premise is that the device stays put. So this is a
**game-level (or section-level) choice made at creation**, not a per-device
toggle. Every device in the game follows the one chosen model.

---

## 2. Agreed product rules

These were pinned down in discussion and are the authoritative behaviour for
fixed-device mode.

### 2.1 Seating

- Players seat themselves exactly as they do today. The round-1 pair at a given
  table + direction seats the device.
- They ARE the pair for the first round at that table/direction. The device's
  `initialSeat` (e.g. `A4EW`) is established by that round-1 pair, unchanged from
  today's join flow.

### 2.2 The device owns the TABLE's boards, not a pair's journey

The stable thing in this mode is the TABLE's board sequence. Table 4 plays a
known set of boards each round regardless of who sits there. Each round, whoever
is physically at the device enters the results for THAT round's boards at THAT
table.

### 2.3 Substitutions are LOCAL to the device

A substitution is about who is sitting at this device right now, and it applies
to THIS table's boards only. It never follows anyone to another table.

- **Rule A — mid-round substitution (some of this round's boards played, some
  not):** the substitute takes the UNPLAYED boards of this round at this table.
- **Rule B — substitution at the start of a round:** the substitute takes ALL of
  the NEXT round's boards at this table.

In both cases the substitute's board set is "boards at THIS table from the cut
point forward" — contiguous and table-local. This is simpler than the
travelling-device handover, whose board sets can be scattered across a pair's
journey.

### 2.4 Movement after a round is a property of the POSITION, not the person

Whether the person at a device moves next round depends on the direction they
are sitting:

- **Stationary position (NS in a Mitchell):** they stay. The boards and
  opponents rotate TO them. There is no "move to the next table."
- **Moving position (EW in a Mitchell):** they rotate to another table next
  round, following the normal movement for that position. This applies to a
  substitute too — once they have played their substituted boards, they are an
  ordinary occupant of a moving position and rotate like anyone else.

### 2.5 The two-device baton pass

This is the key behavioural difference from travelling-device mode. When a person
in a moving position finishes a round:

1. The device AT THE TABLE THEY JUST PLAYED tells them where to go next
   ("move to table 5").
2. They walk to table 5. The device AT TABLE 5 — a DIFFERENT physical device
   that has been sitting there all event — greets them: "EW expected here this
   round."

So the familiar player experience (finish → told where to go → arrive → be
expected) still holds, but the "you're expected" greeting comes from the
DESTINATION table's own device, not from a device that travelled with the
player. It is a baton pass between two stationary devices, coordinated through
the shared movement.

---

## 3. The core invariant

Everything in this mode falls out of ONE invariant, worth stating before any
code:

> **In fixed-device mode, the DEVICE SEAT is a stable physical table position
> (fixed for the event). The SCORING / SUBSTITUTION identity is the board-row
> ANCHOR, which the movement places at that position per round (and which, for a
> moving direction, is a different pair each round).**

In travelling-device mode these two coincide — one device = one ranked pair for
the whole event. In fixed-device mode they DIVERGE. The implementation risk is
entirely in code paths that silently assume they coincide.

---

## 4. Why most of the stack already cooperates

- **Board rows are table-indexed.** `boards` carries
  `tableNumber`/`roundNumber`/`boardNumber`/`ns`/`ew`. "What is at table 4 this
  round, and who (anchor id) sits each side" is a direct query — no reverse
  lookup from a pair is needed.
- **Result submissions are already keyed by `(section, round, table, side)`**,
  not by pair (see the submit-result handler and `board_submissions`). A device
  recording "EW at table 4, round 3 said X" is already table-centric; pair
  attribution flows from the board row's anchor downstream.
- **Substitution is already modelled.** `seat_occupancy` + disjoint board sets +
  `resolveOccupant(occupancies, seat, boardNumber)` already answer "who played
  board N at this seat." Rules A and B are just two occupancies over disjoint,
  table-local board sets — the SAME mechanism as the §2.4.7 handover, with a
  simpler (contiguous) board set.
- **"Expected here" already exists in embryo.** The `expectedLate` phase and
  `readExpectedLateSeats` already express "someone is due at this seat who has
  not arrived." Fixed-device mode leans on this idea every round for a moving
  position.

The upshot: the DATA model and the WRITE path are largely reusable. The new work
is in resolution, flow, and the mode flag — not a movement-model or schema
rewrite.

---

## 5. What needs to be built

1. **A game/section-level mode flag** set at creation (`TRAVELLING` |
   `FIXED_DEVICE`, default `TRAVELLING`). Read wherever resolution and the
   substitution flow branch.

2. **A table-position schedule/play-state resolver**, alongside the existing
   pair-centric `getSchedule` / `resolvePlayState`
   (`src/services/schedule-service.ts`, `src/services/resolve-play-state.ts`).
   For a fixed device it answers: "for table T, direction D, round R — the
   boards, the occupant (anchor) the movement seats here, and the opponents."
   Querying `boards WHERE tableNumber = T` grouped by round, reading the
   `ns`/`ew` anchor per round.

   The progression logic is SIMPLER than travelling-device mode: no forward-only
   single-pair walk, no personal sit-out. A fixed table advances round by round
   and (almost) always has an occupant; a bye/relay round is a property of the
   table, not of a person. This resolver is the bulk of the work and it feeds the
   EXISTING play-flow screens (`roundInfo`, `moveInfo`); it does not add new ones.

3. **"Expected here each round" — REUSES the existing round-info screen.** No new
   UI. The play flow already has a `roundInfo` state
   (`src/hooks/play-state-machine.ts`) that shows the table, boards and
   opponents, and is already the shared entry for playable, sit-out and
   expected-late rounds — it already reads `round.opponentExpectedLate` to render
   a "running late" note. A fixed device simply enters `roundInfo` each round for
   whoever the movement seats here (subs included); the only change is the
   resolver feeding it table-position data instead of a single pair's schedule.

4. **"Where to move next" — REUSES the existing move-info screen.** No new UI. The
   flow already has a `moveInfo` state shown between rounds (`afterRound` →
   `{ state: "moveInfo", nextRoundIndex }`, advanced by `moveInfoContinue`). In
   fixed-device mode a moving-direction occupant hits the same `moveInfo` screen
   with their destination table; the DESTINATION table's device shows its own
   `roundInfo` greeting (the baton pass, §2.5). For a stationary position the
   resolver keeps the occupant on `roundInfo` with no intervening `moveInfo`
   (equivalent to today's stay-put behaviour).

   So items 3 and 4 are resolver/data changes feeding EXISTING screens, not new
   components. The screens already exist; what changes is what the resolver puts
   in front of them.

5. **Substitution UI for the two cut points** (Rule A mid-round, Rule B from next
   round). The underlying write is a `seat_occupancy` board-set split; the only
   new UI is choosing the cut point. The computed board set is table-local and
   contiguous.

What does NOT change:

- **Join, token, auth, URL shape.** The round-1 pair seats the device and the
  device keeps that seat's `secretKey` / localStorage token for the event. No new
  auth principal, no table-level secret.
- **The movement generators and board materialisation.**
- **The result write path / `board_submissions` keying.**

---

## 6. Interaction with the existing substitution model (§2.4.7)

`seat_occupancy` deliberately separates:

- `isArrivalAnchor` — the DEVICE / forward-play identity ("which occupant holds
  the live device and plays the seat forward"); auth follows this.
- `isMainLine` / `standing` — the SCORING / ranking identity.

In travelling-device mode a substitution is one pair handing the physical device
to another pair, so `isArrivalAnchor` genuinely transfers. In fixed-device mode
the device never changes hands — it is nailed to the table — so "the device
identity" is no longer something a substitution transfers. We keep the column for
scoring/auth continuity but stop reading it as "the pair that took the box."

Rules A and B both map to the existing disjoint-board-set occupancy split, so no
new substitution data model is required. The only new logic is computing the
table-local board set from the chosen cut point (this round's unplayed boards, or
next round's boards at this table).

---

## 7. Audit item (do before coding)

Confirm that scoring / leaderboard / USEBIO paths rank the per-round anchors at a
fixed table+direction as the DISTINCT contestants they are. In a Mitchell the EW
anchor at table 4 is a different pair id each round, which is ordinary movement
behaviour and should already work — but we must verify nothing in those paths
assumes "one device = one ranked pair for the whole event" (true in travelling
mode, false in fixed mode). The invariant in §3 is the thing to hold everywhere:
read the pair from the board-row anchor, never from the device seat.

---

## 8. Effort estimate

**Solidly medium: a few days to about a week** for a clean implementation plus
tests. The estimate came DOWN over the course of design as the model simplified:

- Join / auth / token / URL: reused as-is (round-1 pair seats the device).
- Movement model + result write path: reused, already table-keyed.
- Substitution: reuses `seat_occupancy` + disjoint board sets; board sets are
  table-local and contiguous (easier than the travelling-mode handover).
- Player-facing screens: REUSED. "Expected here" and "where to move next" are the
  existing `roundInfo` / `moveInfo` screens fed by the new resolver — no new
  components.
- The real build: the table-position resolver and the mode flag — well-contained
  and mostly additive. The fixed-mode progression logic is simpler than the
  current single-pair walk. The only genuinely new UI is the substitution
  cut-point choice.

Risks to watch:

- The §3 invariant: any path that conflates device seat with scoring pair.
- The §7 audit of scoring/leaderboard/USEBIO under rotating per-round anchors.
- The baton-pass UX (§2.5): two fixed devices coordinating "told to move" →
  "expected here" through the shared movement.
