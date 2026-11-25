# 01 — Core flows

The foundational loop every game shares: navigate, create, set up, seat, start,
play with dual-side confirmation, handle mismatches and special outcomes, enter
deals, and recover from reconnects. Scoring-specific checks live in files 02–07;
this file uses a plain **Pairs · Matchpoints** game.

**Devices:** DIRECTOR + NS + EW (a DISPLAY device is used in file 08).
**Prerequisite:** environment checks `ENV-1..5` in the [README](README.md) pass.

---

## 1. Home & navigation (DIRECTOR)

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ HOME-1 | On the home screen, confirm four buttons: **Join Game**, **Create New Game**, **Manage Games**, **Room Display**. | All four visible. | Y | |
| ☐ HOME-2 | Confirm the **⚙ Settings cog** is top-right. | Present. | Y | |
| ☐ HOME-3 | Tap **Join Game**, then the back arrow. | A "Select Game" list (or empty state), then home. | Y | |
| ☐ HOME-4 | Tap **Manage Games**, then back. | List of **started** games (likely empty), then home. | Y | Not empty - shows games from other dates |
| ☐ HOME-5 | Tap **Room Display**, then back. | "Display Game" list, then home. | Y | |

---

## 2. Create a game (DIRECTOR)

The create form is **two steps**: details, then options.

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ CREATE-1 | From home tap **Create New Game**, then **New Game** at the top of that screen. | The first screen shows a **New Game** button and a **Not started yet** list of games created but not started. The button opens the **Set Up Game** menu with only **Game Details** enabled (Tables, Movement, Timer, Start Game and Delete Game greyed out). **Game Details** opens one page with every field: **Event Name**, **Director Name**, **Event Type**, **Scoring**, **Record Opening Lead**, **Allow Hand Entry**, and **Create Game** at the bottom (no **Next**). Its back arrow returns to the menu. | Y | |
| ☐ CREATE-2 | Type Event Name `Manual Test Pairs`, Director Name `Test Director`. | Both entered. | Y | |
| ☐ CREATE-3 | **Validation:** clear Event Name (or Director), then tap **Create Game**. | The empty field is outlined in red and no game is created. | Y | Field outlined in Red, field not disabled but does nothing when clicked |
| ☐ CREATE-4 | Refill both. | The red outline clears. | Y | |
| ☐ CREATE-5 | Confirm **Event Type** options: **Pairs**, **Teams**, **Swiss Pairs**, **Swiss Teams**. Leave on **Pairs**. | Four options; Pairs selected. | Y | |
| ☐ CREATE-6 | With **Pairs** selected, confirm **Scoring** options are **Matchpoints** and **Cross-IMPs**. Leave **Matchpoints**. | Correct options. | Y | |
| ☐ CREATE-7 | Switch **Event Type** to **Teams**. | **Scoring** now offers the teams methods: **IMP (Victory Points)**, **IMP (aggregate)**, and a board-comparison option (**Point-a-Board** UK / **Board-a-Match** US). | Y | |
| ☐ CREATE-8 | Switch **Event Type** to **Swiss Teams**. | Scoring shows fixed text **"IMP (Victory Points)"** — no dropdown. | Y | TODO: Scoring type should remain on the right (replaces dropdown).  Label text to stay bold. |
| ☐ CREATE-9 | Switch back to **Pairs**. Set **Record Opening Lead** = **No**, **Allow Hand Entry** = **Yes**. | Toggles update. | Y | |
| ☐ CREATE-10 | **Back-nav:** tap the back arrow, then **Game Details** again. | Back on the **Set Up Game** menu (nothing created); the form opens again. Refill it as in CREATE-2 and CREATE-9. | Y | |
| ☐ CREATE-11 | Tap **Create Game**. | Lands on the **Set Up Game** menu for the new game, now with everything enabled: **Game Details**, **Tables**, **Movement**, **Timer**, **Start Game** and a red **Delete Game**. | | |
| ☐ CREATE-12 | Back arrow twice to the main menu, then **Create New Game** again. | `Manual Test Pairs` is listed under **Not started yet**; tapping it opens its **Set Up Game** menu. It is **not** listed under **Manage Games**. | | |

> **BridgeWebs (optional):** if the club has BridgeWebs configured with events
> for today, a **Use BridgeWebs Event** toggle appears above Event Name. Toggle
> it **Yes**, confirm a dropdown lists events, pick one, confirm the name
> prefills, then toggle **No** to type freely. (`CREATE-BW-1`)

---

## 3. Set up the game (DIRECTOR)

Setup starts at the **Set Up Game** menu. Its buttons (**Tables**, **Movement**,
**Timer**, **Start Game**, **Delete Game**) open those pages. The back arrow on each page returns to the menu; the header
menu on those pages only has **Share Director Access**.

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ MENU-1 | Open **Set Up Game** (after creating a game, or from **Create Game → Not started yet**). | Buttons **Game Details**, **Tables**, **Movement**, **Timer**, **Start Game**, and a red **Delete Game**. | | |
| ☐ MENU-2 | Tap each of the middle four buttons (Tables to Start Game) in turn, going back to the menu between them. | Each lands on the matching page. The header menu on each has only **Share Director Access**. | | |
| ☐ MENU-3 | On Tables, Movement, Timer or Start Game tap the back arrow. | Returns to the **Set Up Game** menu. | | |
| ☐ MENU-4 | On the menu, tap **Game Details**, change the name, then **Save**. | Event details open pre-filled; saving returns to the menu. | | |
| ☐ MENU-5 | Tap **Delete Game**. | The delete confirmation. | | |

### 3a. Tables

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ SETUP-1 | On **Tables**, use the stepper to set **3** tables. | Card reads "3 tables". | | |
| ☐ SETUP-2 | Before a movement is chosen, look under the header. | No "Select a movement" banner: the movement is chosen on the **Movement** page. | | |
| ☐ SETUP-3 | Tap a table card to open the **"Table {n}"** dialog, then **Done**. | Dialog shows **North / South** and **East / West** rows. Each empty row has an **"Expected late"** toggle (No / Yes) with "Start without this pair; seat them when they arrive." (full coverage in [file 11](11-withdrawals-late-arrivals.md) `EL-*`). **Done** closes it. | | |

### 3b. Movement

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ SETUP-4 | Open **Movement**. | Picker with recommendation cards grouped by "{n} boards". | | |
| ☐ SETUP-5 | Tap a Mitchell card. | A preview dialog titled with the movement name, showing the round/table breakdown. | | |
| ☐ SETUP-6 | Tap **Select Movement**. | Dialog closes; section shows "Movement: {name}". | | |
| ☐ SETUP-7 | Back on **Tables**, confirm each table shows its **boards to put out** (e.g. "Boards 1–3"). | Board guidance appears. | | |

### 3c. Timer (config only here; live controls in file 08)

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ SETUP-8 | Open **Timer**. | Config: "Timing" (Per Round / Per Board), "Play Duration", "Move Duration", "Warning at…". | | |
| ☐ SETUP-9 | Set **Play Duration** 0 min 30 sec, **Move Duration** 0 min 15 sec. | Values update. **Auto-saves** — no Save button. | | |
| ☐ SETUP-10 | Tap **+ Add break**, set after round 1, duration 1 min. Then **Remove** it (or keep it for file 08). | Break row appears with no "invalid break" warning; removed/kept as chosen. | | |

---

## 4. Players join and take seats (NS + EW)

Keep the DIRECTOR on **Tables** to watch seats fill live.

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ JOIN-1 | **NS device:** home → **Join Game** → **"Manual Test Pairs"**. | "Select Seat": "Table 1".."Table 3" cards. | | |
| ☐ JOIN-2 | On **Table 1**, tap **NS**. | A name panel titled "Table 1" with **North**/**South** fields. | | |
| ☐ JOIN-3 | North = `Alice North`, South = `Bob South` (pick the EBU match or the "Add guest: …" option if a search list appears). Tap **Enter Pair**. | Seated; play flow begins (Round 1 info). | | |
| ☐ JOIN-4 | **DIRECTOR:** watch Table 1. | Alice/Bob appear on Table 1 **live**, no refresh. | | |
| ☐ JOIN-5 | **EW device:** **Join Game → "Manual Test Pairs"**. | Table 1 **NS** now greyed out/taken. | | |
| ☐ JOIN-6 | On **Table 1**, tap **EW**. East = `Carol East`, West = `Dave West`. **Enter Pair**. | Seated. | | |
| ☐ JOIN-7 | Seat the remaining tables (Tables 2 & 3, both directions) using the player devices or spares. | All seats filled. | | |
| ☐ JOIN-8 | **DIRECTOR:** confirm every seat on every table is filled live. | Full seating shown. | | |
| ☐ JOIN-9 | **Duplicate guard:** try to seat a player using an **EBU number already seated** elsewhere. | Rejected with "A player with EBU number … is already seated". | | |
| ☐ JOIN-10 | **DIRECTOR:** open a table with a seated pair. | The pair's row shows its names and an **Evict pair** button (before the start only). | | |
| ☐ JOIN-11 | **Leave before start:** on a seated player device (the "You're seated" screen), tap **Leave table** and confirm. | The seat is freed and the DIRECTOR's table updates live. Re-seat the pair before continuing. | | |

> **Empty seats:** leaving **one** seat empty is a sanctioned sit-out. More
> empty seats must be marked **Expected late** before the game can start; see
> [file 11](11-withdrawals-late-arrivals.md) (`EL-*`). For this core run, seat a
> full field.

---

## 5. Start the game (DIRECTOR)

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ START-1 | Open **Start Game** from the **Set Up Game** menu. | A readiness panel. | | |
| ☐ START-2 | Confirm it reads ready (e.g. **"Everything's ready"**). | No blocking issues listed. | | |
| ☐ START-3 | Tap **Start Game**. | Game starts; you return to the **main menu** (Manage Games → this game opens the **Manage Game Menu**, whose back arrow returns to the main menu). Timer (if set) begins. | | |
| ☐ START-4 | **NS & EW:** confirm they move into round play. | Players see "Table 1, Round 1". | | |
| ☐ START-5 | **Start guard:** (fresh game) leave **two** seats empty and unmarked, then try **Start Game**. | Blocked, listing the problem per section ("More than one pair is missing…"); cannot start. Marking the empty seats **Expected late** clears it (`EL-5`). | | |
| ☐ START-6 | After the start, look at the **Manage Game Menu**. | **Travellers**, **Deals**, **Movement**, **Pairs** (**Teams** in a Teams event), **Finalise Game**, and red **Delete Game**. There is **no** "Share Director Access" button: it is in the header **Menu** ([file 10](10-sharing-export-lifecycle.md) `SHARE-*`). | | |

---

## 6. Play a board with dual-side confirmation (NS + EW)

The heart of the app: both sides enter the **same** board and it confirms.

### 6a. Matching contract

| Check | NS device | EW device | Expected | Actual | Comments |
|---|---|---|---|---|---|
| ☐ PLAY-1 | Tap **Enter Round**. | Tap **Enter Round**. | Both enter the contract wizard. | | |
| ☐ PLAY-2 | If asked, tap the first **board number**. | Same board. | "Enter Contract". | | |
| ☐ PLAY-3 | **Level** 4 → **Suit** 4♠ → **Declarer** South, double **None** → **Result** Made, **=**. | Same choices. | Each step advances; submitting the result goes straight to the waiting screen (there is no Confirm page). | | |
| ☐ PLAY-4 | **Submit:** after the **Result** step there is no Confirm page. | — | NS shows **"Waiting for confirmation"**, with **You entered** `4♠S=` (the result just submitted) underneath. | | |
| ☐ PLAY-5 | — | Submit the matching result. | The board **confirms**; both devices show the **Board Results** (traveller). | | |

> With **Record Opening Lead = Yes**, an **Opening Lead** step appears between
> Declarer and Result; enter a lead card to continue (`PLAY-LEAD-1`).

### 6b. Mismatch safety check

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ PLAY-6 | On the next board, NS enters **Made =**, EW enters **Down −1** (deliberately different). | After both submit, both see **"Results Don't Match"** showing each side's entry. | | |
| ☐ PLAY-7 | Tap **Re-enter Result** on one device and enter the value matching the other side. | The board confirms once they agree. | | |

### 6c. Pass Out / Not Played

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ PLAY-8 | On another board, at the **Level** step tap **Pass Out** on both sides, then submit. | Confirms as "Pass Out". | | |
| ☐ PLAY-9 | On another board, tap **Not Played** on both sides, then submit. | Confirms as "Not Played". | | |

### 6d. Finish the round and move

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ PLAY-10 | After the last board of the round, tap **Next Board** / **Next Round**. | Advances. | | |
| ☐ PLAY-11 | **Deal entry (Allow Hand Entry on):** an **"Enter cards"** step may appear. Lay a full deal (four hands, 13 each) and **Save cards**, or **Skip**. | Saves or skips; never blocks the move. | | |
| ☐ PLAY-12 | A **"Move Info"** screen names the next table/direction. Tap **Continue**. | Advances to the next round's info. | | |
| ☐ PLAY-13 | Play through the remaining rounds the same way. | Each round confirms and advances. | | |
| ☐ PLAY-14 | After the final round, the device shows the **leaderboard** with your pair highlighted. | Final standings shown. | | |

---

## 7. Change device / seat transfer (player devices)

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ XFER-1 | On the NS play screen, open the **Menu** (top-right). Confirm it lists **Scorecard**, **Handover**, **Withdraw**, **Change device** and **Pair details** (handover and withdrawal are covered in files [12](12-handover-substitution.md) and [11](11-withdrawals-late-arrivals.md)). Tap **Change device**. | A **Change device** screen (not a pop-up) with a short code + "Once the code is used, this device will be signed out of the seat." The header back arrow returns to play. | | |
| ☐ XFER-2 | On a spare device: **Join Game → "Manual Test Pairs"** → the seat-transfer entry ("Move a seat to this device") → enter the code → **Take over seat**. | The spare takes the NS seat and lands on the play screen. | | |
| ☐ XFER-3 | Check the original NS device. | Signed out of the seat: shows a "This seat has moved to another device" screen with a **Back to main menu** button, and no longer controls the seat. Tapping **Back to main menu** returns home. | | |
| ☐ XFER-4 | On the active device, **Menu → Pair details**. | Shows the pair number (e.g. **Pair: 1NS**) and both names — no separate North–South line. Tap **Done**. | | |

---

## 8. Resilience / reconnect

| Check | Step | Expected | Actual | Comments |
|---|---|---|---|---|
| ☐ RES-1 | Mid-game, **reload** a player's browser. | Returns to the **first incomplete round**, not the start. | | |
| ☐ RES-2 | Turn a player device's WiFi off and on during play. | On reconnect it re-syncs current state automatically. | | |
| ☐ RES-3 | Put two devices on the **same board's traveller** and make a change on one. | Both update live. | | |
| ☐ RES-4 | Check `/<address>/healthz` again. | Still `"status":"ok"`. | | |
