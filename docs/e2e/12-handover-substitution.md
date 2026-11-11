# 12 — Handovers & substitutions

A **handover** (EBU White Book §2.4.7) is a different pair taking over a seat
part-way through. A stand-in may leave and the real pair arrive, or a pair may
have to stop and a substitute come in. The pair who leaves keeps the boards it
has **already scored**, and the arriving pair plays **every board without a
result yet**. The seat then shows as **Substituted** on the director's
**Pairs** screen, where the director decides how it is ranked.

Withdrawals and late arrivals are in [file 11](11-withdrawals-late-arrivals.md).

**Devices:** DIRECTOR + 2–3 player devices (separate browsers / profiles are
fine).

**Where things are:** "**Pairs**" and "**Travellers → Board N**" are on the
DIRECTOR's Manage Game Menu. "**Leaderboard**" means **Room Display → the game →
Leaderboard**, on the DIRECTOR or a separate DISPLAY device. For a Matchpoints
game choose **Matchpoints** at "Show standings as" to see the "/ top" figures.

---

## Fixtures for this file

3-table Mitchell, 3 rounds, 3 boards a round. The movement is the same as in
[file 11](11-withdrawals-late-arrivals.md#fixtures-for-this-file). **A2NS**
plays boards 4–6 (round 1), 7–9 (round 2, against A1EW) and 1–3 (round 3,
against A3EW).

| Recipe | Command | State |
|---|---|---|
| **F12-A** live | `npm run seed:e2e -- --scoring MP --rounds 3 --play round1 --tokens` | Round 1 played; every pair **Active** and in round 2. Hand over live from here. |
| **F12-B** substituted | `npm run seed:e2e -- --scoring MP --rounds 3 --play partial --handover A2NS --tokens` | Rounds 1–2 played. **A2NS** handed over to **SubA2NS North & SubA2NS South**, who have round 3 (boards 1–3) still to play. The original pair (**PA2NS**) keeps its 6 scored boards. |

The seeder prints the arriving pair's token for **A2NS**. It also prints the
original pair's **retired** token, which the server should now **reject**.

---

## 1. Handing over on the same device (player)

Use **F12-A**. Plant the **A2NS** token: it's the "stand-in" device.

| Check | Step | Expected |
|---|---|---|
| ☐ HAND-1 | Play header **Menu**. | A **Handover** item. (It is offered in every game type, before and after scoring starts.) |
| ☐ HAND-2 | Tap **Handover**. | "A new pair is taking over this seat. Where will they play?" with two cards: **Same device** ("The new pair will use this device. Enter their names and carry on from the next board.") and **Different device** ("The new pair has their own phone or tablet. Show them a code to enter on it. This device will be signed out of the seat."). |
| ☐ HAND-3 | Tap **Same device**. | A **"Handover"** page: "Enter your names to take over this seat. You keep this device and carry on from the next board." with **Player 1** / **Player 2** search fields. **Take over this device** stays disabled until both are filled. |
| ☐ HAND-4 | Enter two new players (e.g. **Sam Sub / Sue Sub**, via "Add guest" if needed) → **Take over this device**. | Back on the play screen, still at **round 2**, table 2. The device now plays for the new pair. |
| ☐ HAND-5 | **Menu → Pair details**. | Shows the **new** pair's names. |
| ☐ HAND-6 | DIRECTOR **Pairs** (no refresh). | **2NS** shows blue **Substituted**. The card lists **both** pairs ("Sam Sub & Sue Sub", then "PA2NS North & PA2NS South"), with the detail line "A pair took over part-way through". |
| ☐ HAND-7 | Tap **2NS**. | Each pair shows its board count: the new pair **6 boards**, the original pair **3 boards** (the round-1 boards it scored). |
| ☐ HAND-8 | Play round 2 on this device and A1EW's. | Boards confirm normally; the travellers show the **new** pair's names on boards 7–9 and the original pair's names on boards 4–6. |

---

## 2. Handing over to a different device (player + arriving device)

Use a fresh **F12-A**. Plant **A2NS** on the stand-in device. The arriving pair
uses a fresh browser with no token.

| Check | Step | Expected |
|---|---|---|
| ☐ HAND-9 | Stand-in: **Menu → Handover → Different device**. | A code, with "On the arriving pair's device, open this game, choose **Move a seat to this device**, enter the code below, then enter their names.", "Expires in 5:00", and "Once the arriving pair claims the code, this device will be signed out of the seat." |
| ☐ HAND-10 | Arriving device: **Join Game →** the event → **Move a seat to this device** → enter the code → **Take over seat**. | A name step: **"Take over this seat"** / "Another pair has been playing this seat. Enter your names to take over from the next board." |
| ☐ HAND-11 | Enter two players → **Take over seat**. | The arriving device lands on the A2NS play screen (round 2). |
| ☐ HAND-12 | Stand-in device. | "This seat has moved to another device" with **Back to main menu**. It can no longer play the seat. |
| ☐ HAND-13 | DIRECTOR **Pairs** (no refresh). | **2NS** turns **Substituted**, listing both pairs. |
| ☐ HAND-14 | Arriving device: tap **Back** on the name step instead of submitting, then claim again with the same code. | The code still works: it is only used up once the names are submitted. |

---

## 3. Who can take over, and coming back

Use **F12-B** unless stated. Plant the **A2NS** (arriving pair) token.

| Check | Step | Expected |
|---|---|---|
| ☐ RET-1 | **Menu → Handover → Same device**, and enter the **current** pair's own names (SubA2NS North / SubA2NS South). | Rejected: "That pair is already playing this seat." |
| ☐ RET-2 | Same, but enter a **third** pair (e.g. Tom Third / Tess Third). | Rejected: "This seat already has a substitute. Only the pair who played it earlier (PA2NS North & PA2NS South) can take it back." |
| ☐ RET-3 | Play **board 1** of round 3 (with the A3EW device). Then **Menu → Handover → Same device**, entering the **original** pair (PA2NS North / PA2NS South). Names in either order, any capitalisation. | Accepted: the original pair is back. DIRECTOR **Pairs** still shows **Substituted** (one substitute), now **original 8 boards / substitute 1 board**. |
| ☐ RET-4 | On a fresh **F12-B**, do the same return **before** the substitute plays anything. | Accepted. **2NS** goes back to **Active** with the original pair's names: a substitute who played nothing leaves no trace. |
| ☐ RET-5 | **Nothing left to play:** on a game with every board played (`--play all`), **Menu → Handover → Same device** with new names. | Rejected: "Every board here already has a result — nothing to hand over." |
| ☐ RET-6 | **Old tokens die:** on a fresh browser, plant the original pair's **retired** token that the seeder printed for F12-B, then **Join Game →** the event. | The seat picker opens (the device is not treated as holding A2NS). |
| ☐ RET-7 | **Teams limit** (`--scoring TEAMS_IMP_VP --tables 4 --play round1 --tokens`): hand over seat A1NS, then try to hand over A1EW (same team) to another new pair. | The second is rejected: "This team already has a substitute. A team can have at most six players." |

---

## 4. Scoring a substituted seat (DIRECTOR, Pairs screen)

Use **F12-B**. Tap **2NS** on **Pairs**. The arriving pair (**SubA2NS**) is
listed first and is the **Main** pair to start with. Every change **saves as
soon as you make it**; there is no Save button.

| Check | Step | Expected |
|---|---|---|
| ☐ SUB-1 | Look at the expanded card. | First a **"Split by board?"** toggle (**One line** / **Two lines**) set to **One line**. Under it, an amber note: "One shared line: **PA2NS North & PA2NS South** gets no NGS/Masterpoint credit — it all goes to **SubA2NS North & SubA2NS South**." Then one box per pair: "SubA2NS North & SubA2NS South — 3 boards" with a purple **Main** badge, and "PA2NS North & PA2NS South — 6 boards". |
| ☐ SUB-2 | In each pair's box. | A **Main pair** radio (only one can be selected) and **"Eligible for local ranking?"** (**No / Yes**, both **Yes**). |
| ☐ SUB-3 | **Leaderboard** (N/S list). | **One** line for seat 2NS, named **"SubA2NS North / SubA2NS South"** with **"(Sub) PA2NS North / PA2NS South"** beneath, scored over **all** of the seat's boards. |
| ☐ SUB-4 | **Pairs**: select **Main pair** on the PA2NS box. | The **Main** badge moves to PA2NS, the radio on SubA2NS clears, and the note now reads "One shared line: **SubA2NS …** gets no NGS/Masterpoint credit — it all goes to **PA2NS …**." |
| ☐ SUB-5 | **Leaderboard**. | The same single line, now named **"PA2NS North / PA2NS South"** with **"(Sub) SubA2NS …"** beneath. The score doesn't change. |
| ☐ SUB-6 | Leave the page and come back to **Pairs** → 2NS. | The choice has stuck (PA2NS is still Main). |
| ☐ SUB-7 | Set **Eligible for local ranking? = No** on **both** pairs. | The seat's line **disappears** from the leaderboard. Its opponents' scores are unchanged: its results still count for them. |
| ☐ SUB-8 | Set both back to **Yes**, then **Split by board? = Two lines**. | The amber note, the **Main** badge and the **Main pair** radios disappear; each pair keeps its own **Eligible** toggle. |
| ☐ SUB-9 | **Leaderboard**. | The original pair now has **its own** line, scored only on its 6 boards. (The arriving pair has no results yet, so it has no line.) |
| ☐ SUB-10 | Play round 3 (boards 1–3) on the A2NS and A3EW devices, then re-check the **Leaderboard**. | A **second** line appears for the arriving pair, scored only on its 3 boards. |
| ☐ SUB-11 | With **Two lines**, set the original pair's **Eligible = No**. | Only the arriving pair's line remains; the original pair is out of the ranking but still counts for its opponents. |
| ☐ SUB-12 | **Error handling:** stop the box's network briefly (or close the server) and flip a toggle. | The toggle **snaps back**, with "Could not save. Please try again." |
| ☐ SUB-13 | **Teams** substitution (any teams game with a handover): open **Pairs**. | The roster is empty for teams, as in `GATE-2`. The amber NGS note is a pairs-only warning. |

> **USEBIO (optional):** with every board played, **Download USEBIO**. With
> **One line**, the seat appears as **one** `PAIR` carrying the **Main** pair's
> names and EBU numbers. With **Two lines**, there are **two** pairs, each with
> only its own boards. (`SUB-USEBIO-1`)
