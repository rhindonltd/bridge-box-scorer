# 11 — Pairs screen, withdrawals, late arrivals & reinstating

How a **Pairs** event (Matchpoints or Cross-IMPs, not Swiss) handles a pair that
is **missing at the start**, **arrives late**, **withdraws part-way**, or **comes
back** after withdrawing — and the director's **Pairs** screen that ties them
together. Substitutions / handovers have their own file:
[12 — Handovers & substitutions](12-handover-substitution.md).

**The rules being tested (design §11):**

- An empty seat can be marked **Expected late** so the game starts without it.
- A pair that joins an expected-late seat after play has begun is **Late**. It
  joins at the round the room is on, and its earlier boards are **absent**.
- A pair can **withdraw** itself from its phone, or the director can withdraw it.
  Every board it has not yet scored is **absent**.
- For each absent pair, the director chooses how its missed boards score:
  - **AVE− / AVE+** (the default): the absent pair gets **40%** and its
    opponents **60%** at matchpoints, or **−3 / +3 IMPs** at Cross-IMPs. In the
    standings an AVE+ is raised to the pair's own average if that is higher,
    and an AVE− lowered to it if that is lower (§4.1.1.1).
  - **Remove**: the boards come out of the movement, and the opponents are
    scored as if they sat out.
- Results that were really played **always stand**.
- A withdrawn pair's **device is signed out**. To bring the pair back, the
  director **reinstates** it with a code that the pair claims on a device.

**Devices:** DIRECTOR + up to four player devices. Separate browsers or browser
profiles on one laptop work. Label each one with the seat whose token you
planted on it.

**Where things are:** "**Pairs**" and "**Travellers → Board N**" are on the
DIRECTOR's Manage Game Menu. "**Leaderboard**" means **Room Display → the game →
Leaderboard**, on the DIRECTOR or a separate DISPLAY device. For a Matchpoints
game choose **Matchpoints** at "Show standings as" to see the "/ top" figures.

---

## Fixtures for this file

Each recipe creates a **new** game in exactly the state its section needs. Run
it, plant the **director token** on the DIRECTOR device, and plant each **player
token** it prints on its own device (see
[README → Fixture setup](README.md#fixture-setup--stand-up-a-game-in-a-known-state)).
`--tokens` prints a token for every seat.

All recipes use a **3-table Mitchell, 3 rounds, 3 boards a round**:

| Round | Table 1 | Table 2 | Table 3 |
|---|---|---|---|
| 1 | A1NS v A1EW (boards 1–3) | A2NS v A2EW (4–6) | A3NS v A3EW (7–9) |
| 2 | A1NS v A3EW (4–6) | A2NS v A1EW (7–9) | A3NS v A2EW (1–3) |
| 3 | A1NS v A2EW (7–9) | A2NS v A3EW (1–3) | A3NS v A1EW (4–6) |

Seeded pairs are named after their seat (`PA1NS North & PA1NS South`). A seeded
late pair is `LateA3EW …`.

| Recipe | Command | State |
|---|---|---|
| **F11-A** pre-start | `npm run seed:e2e -- --scoring MP --rounds 3 --prestart --empty A3EW --tokens` | Seated, **not started**; A3EW empty and **unmarked**. |
| **F11-B** running late | `npm run seed:e2e -- --scoring MP --rounds 3 --play partial --expectedLate A3EW --tokens` | Rounds 1–2 played, except the boards against A3EW, which is **empty and expected late**. |
| **F11-C** late arrival | `npm run seed:e2e -- --scoring MP --rounds 2 --play all --expectedLate A3EW --lateArrive A3EW --tokens` | 2-round game. A3EW **arrived in round 2**: its round-1 boards (7–9) are absent, and its round-2 boards (4–6 against A1NS) are left for you to play. |
| **F11-D** withdrawn | `npm run seed:e2e -- --scoring MP --rounds 3 --play partial --withdraw A1NS@3 --tokens` | Rounds 1–2 played. **A1NS withdrew from round 3**: boards 7–9 against A2EW are absent (AVE− / AVE+). |
| **F11-E** live | `npm run seed:e2e -- --scoring MP --rounds 3 --play round1 --tokens` | Round 1 played; everyone **Active** and sitting in **round 2**. Withdraw live from here. |
| **F11-F** future withdrawal | `npm run seed:e2e -- --scoring MP --rounds 3 --play round1 --withdraw A1NS@3 --tokens` | Round 1 played; A1NS has withdrawn from round 3, so **A2EW will meet nobody in round 3**. |

---

## 1. The Pairs screen (DIRECTOR)

| Check | Step | Expected |
|---|---|---|
| ☐ PAIRS-1 | **F11-A** (not started): open the Manage Game Menu. | **No "Pairs"** button. It appears only once the game has started. |
| ☐ PAIRS-2 | **F11-D**: Manage Game Menu → **Pairs**. | A **"Pairs"** screen: "Every pair in the game. Tap a pair to withdraw or reinstate it, or to choose how a late, withdrawn or substituted pair's boards score." |
| ☐ PAIRS-3 | Look at the layout. | One card per seat, headed by the seat (**1NS**, **1EW**, **2NS**, …) in **table order, NS before EW**. |
| ☐ PAIRS-4 | Read each card's badge (top-right of the header strip). | **1NS** shows red **Withdrawn**; every other seat shows green **Active**. |
| ☐ PAIRS-5 | Read the line under 1NS's names. | "Withdrew in round 3 — 3 boards not played". |
| ☐ PAIRS-6 | Note the small **chevron** on each card; tap a card, then tap it again. | It expands to show that pair's actions (chevron flips), then collapses. |
| ☐ PAIRS-7 | **F11-B**: open **Pairs**. | **3EW** shows amber **Not arrived**, "Seat not filled", and "Not arrived yet — 9 boards unplayed" (every board the seat has, until a pair sits there). |
| ☐ PAIRS-8 | Seed with `--sections 2` (any recipe) and open **Pairs**. | Pills **All / Section A / Section B** at the top; each section is a grey card headed "Section A" / "Section B". Tapping **Section B** shows only B's seats. (With one section there are no pills.) |
| ☐ PAIRS-9 | Keep **Pairs** open on the DIRECTOR while a player withdraws from their phone (`WD-*` below). | The seat turns **Withdrawn** **without** refreshing the screen. |

---

## 2. Expected-late seats before the start (DIRECTOR)

Use **F11-A**. Manage Games → the E2E event → **Set Up Game** → **Tables**.

| Check | Step | Expected |
|---|---|---|
| ☐ EL-1 | Tap **Table 3**; look at the **East / West** row. | Empty, with an **"Expected late"** toggle (**No / Yes**) and "Start without this pair; seat them when they arrive." |
| ☐ EL-2 | Look at a **seated** row. | An **"Evict pair"** button; no expected-late toggle. |
| ☐ EL-3 | Leave A3EW unmarked. Setup menu → **Start Game**. | **Ready**: one empty seat is the single permitted **sit-out**. |
| ☐ EL-4 | Back on **Tables**, evict **table 2's N/S** pair (Table 2 → **Evict pair** → confirm). Open **Start Game**. | **Blocked**, with both: "One or more tables have only one pair seated. Seat both pairs, mark the empty seat as expected late, or leave the whole table empty." and "More than one pair is missing. A session allows at most one sit-out — mark the other empty seats as expected late to start without them." |
| ☐ EL-5 | Mark **both** empty seats **Expected late = Yes** (Table 3 E/W, Table 2 N/S). **Done** → **Start Game**. | **Ready**: any number of seats may be expected late. |
| ☐ EL-6 | Set both toggles back to **No**. Seat a pair at table 2 N/S again (Join Game on a device), then evict **table 3's N/S** pair so the whole of table 3 is empty. Open **Start Game**. | **Blocked** with only "More than one pair is missing…": no half-table message, because table 3 is wholly empty. |
| ☐ EL-7 | Mark both table-3 seats **Expected late = Yes** and **Start Game**. | The game **starts** with table 3 empty. |
| ☐ EL-8 | Manage Game Menu → **Manage Tables** → Table 3. | Each row reads "Expected late — not yet seated" and "The pair can join from a device when they arrive." The toggle has gone. On other tables, seated rows no longer offer **Evict**. |

---

## 3. A seat that is still empty during play

Use **F11-B**. Plant the **A1NS** token: A1NS is due to meet the empty A3EW in
**round 2** (boards 4–6).

| Check | Step | Expected |
|---|---|---|
| ☐ RUN-1 | Open the game on the A1NS device. | It sits on **round 2** with the amber notice: "Your opponents haven't arrived yet — they're running late. Wait for them and this round will open automatically when the director seats them. If they're missing this round, move on to the next." |
| ☐ RUN-2 | Confirm the round **can't be entered** and a **Move on to next round** button is offered. **Don't tap it yet** (`LATE-5` needs A1NS to wait). | As described. |
| ☐ RUN-3 | DIRECTOR: **Travellers → Board 7**. | Line **A3NS v A3EW** (round 1) shows **A60/40**: A3NS AVE+, the empty seat AVE−. |
| ☐ RUN-4 | **Leaderboard**, **E/W** list. | **No line for A3EW**: an empty seat is never ranked. |
| ☐ RUN-5 | DIRECTOR: **Pairs** → **3EW** → **Missed boards** → **Remove**. | Helper text: "The boards are taken out of the movement; its opponents are scored as if they sat out." It **saves immediately**; there is no Save button. |
| ☐ RUN-6 | **Travellers → Board 7**. | The **A3NS v A3EW** line has **gone**. |
| ☐ RUN-7 | **Leaderboard** (Matchpoints view). | A3NS is now scored over **one round fewer** (its "/ top" figure drops), with no AVE+ credit. |
| ☐ RUN-8 | Switch **Missed boards** back to **AVE− / AVE+**. | The traveller line and the credit return. Helper text: "Its opponents get AVE+ on each board they can't play." |
| ☐ RUN-9 | **Moving on:** on a *fresh* **F11-B**, A1NS device → **Move on to next round**. | Lands on **round 3**, table 1 against **A2EW** (boards 7–9), ready to play. |

---

## 4. Late arrival

### 4a. Seat a latecomer live (player + DIRECTOR)

Continue on the **F11-B** game from section 3 (A1NS still waiting on round 2).
The latecomer uses a fresh browser with no token.

| Check | Step | Expected |
|---|---|---|
| ☐ LATE-1 | Latecomer: **Join Game →** the E2E event → **Table 3 → EW**. | The seat can be taken: it was never filled. |
| ☐ LATE-2 | Enter two names → **Enter Pair**. | Seated, starting at the **round the room is on**: **round 2**, table 1 against **A1NS** (boards 4–6), not round 1. |
| ☐ LATE-3 | DIRECTOR **Pairs** (no refresh). | **3EW** turns amber **Late**: "Arrived in round 2 — 3 boards missed". |
| ☐ LATE-4 | Tap **3EW**. | Only the **Missed boards** choice, carrying over whatever was set for the empty seat. |
| ☐ LATE-5 | A1NS device (still on round 2). | **Without a reload**, the running-late notice is replaced by a normal round 2 against the late pair, with boards 4–6 ready. |
| ☐ LATE-6 | Play boards 4–6 on both devices. | They confirm normally and count as real results. |
| ☐ LATE-7 | **Travellers → Board 7**. | **A3NS v A3EW** (round 1) still shows **A60/40**: the late pair is AVE− and A3NS is AVE+. |

### 4b. The seeded late arrival

Use **F11-C**.

| Check | Step | Expected |
|---|---|---|
| ☐ LATE-8 | DIRECTOR **Pairs**. | **3EW** shows **Late**, "Arrived in round 2 — 3 boards missed". |
| ☐ LATE-9 | Plant the **A3EW** and **A1NS** tokens on two devices. | Both open round 2, table 1, with boards 4–6 ready. Play them. |
| ☐ LATE-10 | **Leaderboard**. | A3EW is **ranked**: a late pair keeps its standing. It is scored on its real round-2 boards plus the AVE− boards from round 1. |
| ☐ LATE-11 | **Pairs → 3EW → Remove**, then **Leaderboard**. | A3EW and A3NS are now scored over one round fewer; boards 7–9's A3NS v A3EW line disappears from the traveller. |

---

## 5. A pair withdraws from its own phone (player)

### 5a. Withdrawing from the round it is on

Use **F11-E**. Plant **A1NS** on the "withdrawing" device and **A3EW** on the
"opponent" device. They meet in **round 2**, table 1.

| Check | Step | Expected |
|---|---|---|
| ☐ WD-1 | Withdrawing device: play header **Menu**. | A **Withdraw** item alongside Handover, Change device and Pair details. |
| ☐ WD-2 | Tap **Withdraw**. | A **"Withdraw"** page: "Withdraw your pair from the event? You won't play any more boards, starting with the next board you haven't scored." and "Results you've already entered stand. This can't be undone from your device — if it's a mistake, ask the director." |
| ☐ WD-3 | **Cancel**. | Back to play; DIRECTOR **Pairs** still shows 1NS **Active**. |
| ☐ WD-4 | **Menu → Withdraw → Withdraw our pair**. | Header **"Withdrawn"**: "Your pair has withdrawn. Your opponents will be moved on, and the director will decide how the boards you miss are scored." **Done** goes home. |
| ☐ WD-5 | Withdrawing device: **Join Game →** the event. | The **seat picker** (with 1NS taken), not the play screen: the device has been signed out of A1NS. |
| ☐ WD-6 | Opponent device (A3EW), without a reload. | **Moved on**: it now shows **round 3**, table 2 against **A2NS** (boards 1–3). |
| ☐ WD-7 | DIRECTOR **Pairs**. | **1NS** shows **Withdrawn**: "Withdrew in round 2 — 6 boards not played". |
| ☐ WD-8 | **Travellers → Board 4**. | **A1NS v A3EW** (round 2) shows **A40/60**: A1NS AVE−, A3EW AVE+. |
| ☐ WD-9 | **Results already entered stand:** **Travellers → Board 1**. | A1NS's round-1 result is unchanged. |

### 5b. Meeting a pair that has already withdrawn

Use **F11-F**. Plant **A2EW** and **A3NS** on two devices; they meet in round 2,
table 3 (boards 1–3). A2EW's round 3 opponent (A1NS) has withdrawn.

| Check | Step | Expected |
|---|---|---|
| ☐ WD-10 | Play round 2 on both devices (Pass Out is quickest). On A2EW, continue past **Move Info**. | Round 3 info shows: "Your opponents have withdrawn, so these boards won't be played. Move on to the next round." The round can't be entered. |
| ☐ WD-11 | Tap **Move on to next round**. | A2EW reaches the end of its session (the **leaderboard**). |
| ☐ WD-12 | **Not before the start:** on **F11-A** (not started), plant a seat's token and open the game. | The **"You're seated"** screen offers **Leave table**, with no Menu and no Withdraw. Withdrawal only exists once play has started. |

---

## 6. The director withdraws a pair

For when a pair walks out and takes its device with it. Use a fresh **F11-E**,
with **A1NS** and **A3EW** tokens planted.

| Check | Step | Expected |
|---|---|---|
| ☐ WDD-1 | DIRECTOR **Pairs** → tap **1NS**. | A red **Withdraw this pair** button. |
| ☐ WDD-2 | Tap it. | "Withdraw? They won't play any more boards from the round they're on." with **Cancel** / **Confirm**. **Cancel** changes nothing. |
| ☐ WDD-3 | **Withdraw this pair → Confirm**. | **1NS** becomes **Withdrawn** (round 2, 6 boards not played). |
| ☐ WDD-4 | On the A1NS device, open **Join Game →** the event. | The **seat picker**: the device's token was retired when the pair was withdrawn. |
| ☐ WDD-5 | Opponent device (A3EW). | Moved on to round 3 without a reload, as in `WD-6`. |
| ☐ WDD-6 | Expand a **Withdrawn**, **Late**, **Not arrived** or **Substituted** card. | **No** "Withdraw this pair" button. Only Active pairs offer it. |

---

## 7. Scoring a withdrawal: AVE− / AVE+ vs Remove (DIRECTOR)

Use **F11-D**: A1NS withdrew from round 3, so boards 7–9 against A2EW are
absent. Switch the leaderboard to **Matchpoints** so the "/ top" figures show.

| Check | Step | Expected |
|---|---|---|
| ☐ AVE-1 | **Pairs** → **1NS**. | **Missed boards** set to **AVE− / AVE+** (default): "This pair gets AVE− and its opponents AVE+ on each missed board." |
| ☐ AVE-2 | **Leaderboard** (Matchpoints). | **A1NS** (N/S) and **A2EW** (E/W) are scored over **three more boards** than everyone else (round 3 isn't played yet, but their absent boards already count). A1NS is still **ranked**. |
| ☐ AVE-3 | **Travellers → Board 7**. | The A1NS v A2EW line shows **A40/60**. |
| ☐ AVE-4 | **Board tops:** on Board 7, every pair's matchpoints are between **0 and the top** shown. | No real result scores above the top or below zero, even though the board has an AVE line on it. |
| ☐ AVE-5 | **Uplift (§4.1.1.1):** look at A2EW's standing. | If A2EW averages **above 60%** on its real boards, its AVE+ boards count at that **higher** average in the standings. The traveller still shows **A40/60**. |
| ☐ AVE-6 | **Missed boards → Remove**. | Saves straight away, with "The boards are taken out of the movement; its opponents are scored as if they sat out." |
| ☐ AVE-7 | **Travellers → Board 7**. | The A1NS v A2EW line has **gone**. |
| ☐ AVE-8 | **Leaderboard**. | A1NS and A2EW are now scored over the **same** boards as everyone else, with no credit for boards 7–9. A1NS stays **ranked**. |
| ☐ AVE-9 | **Cross-IMPs:** repeat `AVE-1..3` and `AVE-6..7` on `--scoring XIMP` (otherwise the same as **F11-D**). | The absent boards count **−3** to A1NS and **+3** to A2EW; **Remove** takes them out. |
| ☐ AVE-10 | **Live update:** with the Leaderboard open on a DISPLAY, flip the choice on the DIRECTOR. | The display updates without a refresh. |

---

## 8. Reinstating a withdrawn pair

Use **F11-D**. The returning device should have **no** token for the game (a
fresh browser). Plant **A2EW** on a second device.

| Check | Step | Expected |
|---|---|---|
| ☐ RE-1 | DIRECTOR **Pairs** → **1NS** (Withdrawn). | The **Missed boards** choice and a blue **Reinstate on a device** button. |
| ☐ RE-2 | Tap **Reinstate on a device**. | "On the returning pair's device, enter this code to bring them back in." A code, "Expires in 5:00" counting down, **Generate new code**, and "The returning pair claims the code on their device to pick up the seat again." |
| ☐ RE-3 | A2EW device, before claiming. | At the end of its session: its last round was the withdrawn one. |
| ☐ RE-4 | Returning device: **Join Game →** the event → **Move a seat to this device** → enter the code → **Take over seat**. | Lands on the **A1NS play screen**, round 3, table 1; **no names are asked for**. |
| ☐ RE-5 | DIRECTOR **Pairs** (no refresh). | **1NS** is back to green **Active**. |
| ☐ RE-6 | A2EW device (no reload). | Back on **round 3** against A1NS, with boards 7–9 ready to play. |
| ☐ RE-7 | **Travellers → Board 7**. | No A40/60 any more: the board is waiting to be played. |
| ☐ RE-8 | Play a board on both devices. | It confirms normally. |
| ☐ RE-9 | Try the same code again on another device. | Rejected: codes are **single-use**. |
| ☐ RE-10 | **Expiry:** withdraw the pair again (DIRECTOR **Pairs** → **Withdraw this pair**), tap **Reinstate on a device**, and wait past 5:00. | "Code expired." with **Generate new code**; claiming the expired code is rejected. |
| ☐ RE-11 | **Stale code:** with 1NS withdrawn, mint code X, then mint code Y and claim **Y**. Now claim **X** on another device. | **X** is rejected with "This pair has not withdrawn." (it is already back). |

**Device lost or broken (pair not withdrawn):**

| Check | Step | Expected |
|---|---|---|
| ☐ DEV-1 | DIRECTOR **Pairs** → an **Active** pair (e.g. **1NS**). | Two buttons: **Move to a new device** and a red **Withdraw this pair**. (The same **Move to a new device** button is on a **Late** pair; not on a Withdrawn, Not arrived or Substituted one.) |
| ☐ DEV-2 | Tap **Move to a new device**. | "Device lost or broken? Give this code to the pair to enter on their new device.", then "On the pair's new device, open this game, choose Move a seat to this device, and enter the code below. Their old device will be signed out." A code and a countdown. |
| ☐ DEV-3 | New device: **Join Game →** the event → **Move a seat to this device** → enter the code → **Take over seat**. | Lands on the **A1NS play screen** where the pair left off; **no names are asked for**. |
| ☐ DEV-4 | DIRECTOR **Pairs** (no refresh). | **1NS** is still green **Active**, with no "Withdrew" text and no missed boards. |
| ☐ DEV-5 | The old phone, which was switched off (or in airplane mode) during the move, is switched back on and the game reopened. | Within a few seconds it shows **"This seat has moved to another device"** instead of its play screen; it cannot submit results. (A phone that was still connected shows the same screen at the moment of the move.) The new device can submit. |


---

## 9. Which events have these controls

| Check | Step | Expected |
|---|---|---|
| ☐ GATE-1 | **Swiss Pairs** (`--scoring SWISS_PAIRS_MP --tables 4 --play round1 --tokens`): player **Menu**. | **No Withdraw** item. |
| ☐ GATE-2 | **Teams** (`--scoring TEAMS_IMP_VP --tables 4 --play round1`): Manage Game Menu → **Pairs**. | "No pairs seated yet." The roster applies to pairs events only. |
| ☐ GATE-3 | Teams or Swiss: **Manage Tables** → a table, after the start. | A **Change standing** button (Active / Withdrawn / Late / No standing) is still offered. On a Pairs event it is **hidden**. |
