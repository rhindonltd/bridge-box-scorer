# 01 — Core flows

The foundational loop every game shares: navigate, create, set up, seat, start,
play with dual-side confirmation, handle mismatches and special outcomes, enter
deals, and recover from reconnects. Scoring-specific checks live in files 02–07;
this file uses a plain **Pairs · Matchpoints** game.

**Devices:** DIRECTOR + NS + EW (a DISPLAY device is used in file 08).
**Prerequisite:** environment checks `ENV-1..5` in the [README](README.md) pass.

---

## 1. Home & navigation (DIRECTOR)

| Check | Step | Expected | Actual |
|---|---|---|
| ☐ HOME-1 | On the home screen, confirm four buttons: **Join Game**, **Create New Game**, **Manage Games**, **Room Display**. | All four visible. | Y
| ☐ HOME-2 | Confirm the **⚙ Settings cog** is top-right. | Present. | Y
| ☐ HOME-3 | Tap **Join Game**, then the back arrow. | A "Select Game" list (or empty state), then home. | Y (empty list)
| ☐ HOME-4 | Tap **Manage Games**, then back. | List (likely empty), then home. | Y (empty list)
| ☐ HOME-5 | Tap **Room Display**, then back. | "Display Game" list, then home. | Y (empty list)

To be changed: Menu items do not match title of the page you go to:
  - Join Game -> Join Game (OK)
  - Create New Game -> Create Game (Not OK - Should consistently be 'Create Game')
  - Manage Games -> Manage Game (Not OK - Should consistently be 'Manage Game')
  - Room Display -> Display Game (Not OK - Should consistently be 'Display Game')

---

## 2. Create a game (DIRECTOR)

The create form is **two steps**: details, then options.

| Check | Step | Expected | Actual |
|---|---|---|
| ☐ CREATE-1 | From home tap **Create New Game**. | **"Create Game"**, step 1: **Event Name** + **Director Name**, **Next** at the bottom. | Y
| ☐ CREATE-2 | Type Event Name `Manual Test Pairs`, Director Name `Test Director`. | Both entered. | Y
| ☐ CREATE-3 | **Validation:** clear Event Name (or Director). | **Next** is disabled; a hint to enter an event name and director shows. | Y
| ☐ CREATE-4 | Refill both, tap **Next**. | Step 2: **Event Type**, **Scoring**, **Tournament Level**, **Record Opening Lead**, **Allow Hand Entry**. | Y 
| ☐ CREATE-5 | Confirm **Event Type** options: **Pairs**, **Teams**, **Swiss Pairs**, **Swiss Teams**. Leave on **Pairs**. | Four options; Pairs selected. | Y
| ☐ CREATE-6 | With **Pairs** selected, confirm **Scoring** options are **Matchpoints** and **Cross-IMPs**. Leave **Matchpoints**. | Correct options. | Y
| ☐ CREATE-7 | Switch **Event Type** to **Teams**. | **Scoring** now offers the teams methods: **IMP (Victory Points)**, **IMP (aggregate)**, and a board-comparison option (**Point-a-Board** UK / **Board-a-Match** US). | Y
| ☐ CREATE-8 | Switch **Event Type** to **Swiss Teams**. | Scoring shows fixed text **"IMP (Victory Points)"** — no dropdown. | Y
| ☐ CREATE-9 | Switch back to **Pairs**. Set **Record Opening Lead** = **No**, **Allow Hand Entry** = **Yes**. | Toggles update. | Y
| ☐ CREATE-10 | **Back-nav:** tap the back arrow. | Returns to step 1 with Event Name + Director still filled. | Y
| ☐ CREATE-11 | Tap **Next**, then **Create Game**. | Lands on the **setup** screen (Tables view) for the new game. | Y

To be changed:
For CREATE-3, the descriptive text at the top should be replaced by the field being highlighted when the 'Next' button is pressed if not filled in.
For CREATE-7, the option just says 'IMP', not 'IMP (Aggregate)'.  Should be changed.



> **BridgeWebs (optional):** if the club has BridgeWebs configured with events
> for today, a **Use BridgeWebs Event** toggle appears above Event Name. Toggle
> it **Yes**, confirm a dropdown lists events, pick one, confirm the name
> prefills, then toggle **No** to type freely. (`CREATE-BW-1`)

---

## 3. Set up the game (DIRECTOR)

Setup has three views reachable from the header **Setup menu**: **Tables**,
**Movement**, **Timer**.

Testers Note: It also has 'Start Game' and 'Return to main menu'.
To be changed:
These screens dont have 'Back Arrow' functionality to go back to the setup screen (the screen from CREATE-4).


### 3a. Tables

| Check | Step | Expected |
|---|---|---|
| ☐ SETUP-1 | On **Tables**, use the stepper to set **3** tables. | Card reads "3 tables". | Y
| ☐ SETUP-2 | Confirm a banner prompts to choose a movement. | "Select a movement for this section." visible. | Y
| ☐ SETUP-3 | Tap a table card to open the **"Table {n}"** dialog, then **Done**. | Dialog shows North/South and East/West rows (empty), then closes. | Y

To be changed:
SETUP-2 - The banner shows 'Select a movement for this section.' even for a single section event where it should simply read 'Select a movement'.
SETUP-3 - There should be a margin at the top and bottom of the dialog box.  The 'Table 1' heading should be on a grey background to be consistent with the rest of the system. The 'Expected late' button doesn't toggle.  I'm not sure what the 'Empty' italic text is for.  Please see the 'Movement Dialog from SETUP-5' for the expected UI layout (i.e., also rounded corners).


### 3b. Movement

| Check | Step | Expected |
|---|---|---|
| ☐ SETUP-4 | Open **Movement**. | Picker with recommendation cards grouped by "{n} boards". | Y
| ☐ SETUP-5 | Tap a Mitchell card. | A preview dialog titled with the movement name, showing the round/table breakdown. | Y 
| ☐ SETUP-6 | Tap **Select Movement**. | Dialog closes; section shows "Movement: {name}". | Y 
| ☐ SETUP-7 | Back on **Tables**, confirm each table shows its **boards to put out** (e.g. "Boards 1–3"). | Board guidance appears. | Y

To be changed:
SETUP-5 - When I select 'Close' on the dialog, the movement is has a blue border so it looks like it has been selected.  It shouldn't show this border even if actually selecting a movement is much more visually distinctive.

### 3c. Timer (config only here; live controls in file 08)

| Check | Step | Expected |
|---|---|---|
| ☐ SETUP-8 | Open **Timer**. | Config: "Timing" (Per Round / Per Board), "Play Duration", "Move Duration", "Warning at…". | Y
| ☐ SETUP-9 | Set **Play Duration** 0 min 30 sec, **Move Duration** 0 min 15 sec. | Values update. **Auto-saves** — no Save button. | Y
| ☐ SETUP-10 | Tap **+ Add break**, set after round 1, duration 1 min. Then **Remove** it (or keep it for file 08). | Break row appears with no "invalid break" warning; removed/kept as chosen. | Y

To be changed:
When I go from 'Per Board' to 'Per Round', the Play Duration should update accordingly - i.e., there are 3 boards per round, it should now be showing 3 * (whatever per board shows) and vice versa (rounding as appropriate)

Query:
SETUP-9 Is it ok to have no save button or is this confusing to the user?

---

## 4. Players join and take seats (NS + EW)

Keep the DIRECTOR on **Tables** to watch seats fill live.

| Check | Step | Expected |
|---|---|---|
| ☐ JOIN-1 | **NS device:** home → **Join Game** → **"Manual Test Pairs"**. | "Select Seat": "Table 1".."Table 3" cards. | Y
| ☐ JOIN-2 | On **Table 1**, tap **NS**. | A name panel titled "Table 1" with **North**/**South** fields. | Y
| ☐ JOIN-3 | North = `Alice North`, South = `Bob South` (pick the EBU match or the "Add guest: …" option if a search list appears). Tap **Enter Pair**. | Seated; play flow begins (Round 1 info). | N
| ☐ JOIN-4 | **DIRECTOR:** watch Table 1. | Alice/Bob appear on Table 1 **live**, no refresh. | Y
| ☐ JOIN-5 | **EW device:** **Join Game → "Manual Test Pairs"**. | Table 1 **NS** now greyed out/taken. | Y
| ☐ JOIN-6 | On **Table 1**, tap **EW**. East = `Carol East`, West = `Dave West`. **Enter Pair**. | Seated. | Y
| ☐ JOIN-7 | Seat the remaining tables (Tables 2 & 3, both directions) using the player devices or spares. | All seats filled. | Y
| ☐ JOIN-8 | **DIRECTOR:** confirm every seat on every table is filled live. | Full seating shown. | Y
| ☐ JOIN-9 | **Duplicate guard:** try to seat a player using an **EBU number already seated** elsewhere. | Rejected with "A player with EBU number … is already seated". | Y

> **Sit-out:** leaving one seat empty in an odd field is a sanctioned sit-out;
> see file 07 (`SPEC-SITOUT-1`). For this core run, seat a full field.

BUG: JOIN-3 - When NS enters their names, they are taken immediately to the 'Game Complete' page

To be changed:
On small screens, instead of showing the players names on the tables page, it should just highlight the position to show it has been taken, and the user should have to click on it to see who has taken it.
JOIN-9 - It doesn't show anything until the button is clicked - it should be able to validate when the player enters the ebu number and selects from the drop down.


---

## 5. Start the game (DIRECTOR)

| Check | Step | Expected |
|---|---|---|
| ☐ START-1 | Open **Start Game** from the Setup menu. | A readiness panel. | Y
| ☐ START-2 | Confirm it reads ready (e.g. **"Everything's ready"**). | No blocking issues listed. | Y
| ☐ START-3 | Tap **Start Game**. | Game starts; you land on the **Manage Game Menu**. Timer (if set) begins. |
| ☐ START-4 | **NS & EW:** confirm they move into round play. | Players see "Table 1, Round 1". |
| ☐ START-5 | **Start guard:** (fresh game) try **Start Game** with a seat empty in a movement that requires it filled. | Blocked, listing the problem per section; cannot start. | Y

To be changed:
The layout of this screen in the success state should be a box centered rather than at the top, and the button within that box at the bottom and horizontally centered.

---

## 6. Play a board with dual-side confirmation (NS + EW)

The heart of the app: both sides enter the **same** board and it confirms.

### 6a. Matching contract

| Check | NS device | EW device | Expected |
|---|---|---|---|
| ☐ PLAY-1 | Tap **Enter Round**. | Tap **Enter Round**. | Both enter the contract wizard. |
| ☐ PLAY-2 | If asked, tap the first **board number**. | Same board. | "Enter Contract". |
| ☐ PLAY-3 | **Level** 4 → **Suit** 4♠ → **Declarer** South, double **None** → **Result** Made, **=**. | Same choices. | Each step advances; lands on **Confirm**. |
| ☐ PLAY-4 | **Confirm:** summary reads `4♠ by South, Made`. Tap **Submit**. | — | NS shows **"Waiting for confirmation"**. |
| ☐ PLAY-5 | — | Submit the matching result. | The board **confirms**; both devices show the **Board Results** (traveller). |

> With **Record Opening Lead = Yes**, an **Opening Lead** step appears between
> Declarer and Result; enter a lead card to continue (`PLAY-LEAD-1`).

TEST: Cannot test this since entering players takes them immediately to the 'Game Complete' screen.

### 6b. Mismatch safety check

| Check | Step | Expected |
|---|---|---|
| ☐ PLAY-6 | On the next board, NS enters **Made =**, EW enters **Down −1** (deliberately different). | After both submit, both see **"Results Don't Match"** showing each side's entry. |
| ☐ PLAY-7 | Tap **Re-enter Result** on one device and enter the value matching the other side. | The board confirms once they agree. |

TEST: Cannot test this since entering players takes them immediately to the 'Game Complete' screen.

### 6c. Pass Out / Not Played

| Check | Step | Expected |
|---|---|---|
| ☐ PLAY-8 | On another board, at the **Level** step tap **Pass Out** on both sides, then submit. | Confirms as "Pass Out". |
| ☐ PLAY-9 | On another board, tap **Not Played** on both sides, then submit. | Confirms as "Not Played". |

TEST: Cannot test this since entering players takes them immediately to the 'Game Complete' screen.

### 6d. Finish the round and move

| Check | Step | Expected |
|---|---|---|
| ☐ PLAY-10 | After the last board of the round, tap **Next Board** / **Next Round**. | Advances. |
| ☐ PLAY-11 | **Deal entry (Allow Hand Entry on):** an **"Enter cards"** step may appear. Lay a full deal (four hands, 13 each) and **Save cards**, or **Skip**. | Saves or skips; never blocks the move. |
| ☐ PLAY-12 | A **"Move Info"** screen names the next table/direction. Tap **Continue**. | Advances to the next round's info. |
| ☐ PLAY-13 | Play through the remaining rounds the same way. | Each round confirms and advances. |
| ☐ PLAY-14 | After the final round, the device shows the **leaderboard** with your pair highlighted. | Final standings shown. |

TEST: Cannot test this since entering players takes them immediately to the 'Game Complete' screen.

---

## 7. Change device / seat transfer (player devices)

| Check | Step | Expected |
|---|---|---|
| ☐ XFER-1 | On the NS play screen, open the **Menu** (top-right) → **Change device**. | A short code + "Once the code is used, this device will be signed out of the seat." |
| ☐ XFER-2 | On a spare device: **Join Game → "Manual Test Pairs"** → the seat-transfer entry ("Move a seat to this device") → enter the code → **Take over seat**. | The spare takes the NS seat and lands on the play screen. |
| ☐ XFER-3 | Check the original NS device. | Signed out of the seat: shows a "This seat has moved to another device" screen with a **Back to main menu** button, and no longer controls the seat. Tapping **Back to main menu** returns home. |
| ☐ XFER-4 | On the active device, **Menu → Pair details**. | Shows pair number, direction, both names. Tap **Done**. |

> FIXED: Previously the signed-out device stayed on the play screen as if still
> logged in. It now shows a dedicated "seat has moved" screen whose **Back to
> main menu** button returns home. (The "Change device" dialog's own Done/Close
> just dismisses the code — it no longer needs to navigate, because the real
> sign-out is detected when another device claims the code.)

---

## 8. Resilience / reconnect

| Check | Step | Expected |
|---|---|---|
| ☐ RES-1 | Mid-game, **reload** a player's browser. | Returns to the **first incomplete round**, not the start. |
| ☐ RES-2 | Turn a player device's WiFi off and on during play. | On reconnect it re-syncs current state automatically. |
| ☐ RES-3 | Put two devices on the **same board's traveller** and make a change on one. | Both update live. |
| ☐ RES-4 | Check `/<address>/healthz` again. | Still `"status":"ok"`. |

TEST: Cannot test this since entering players takes them immediately to the 'Game Complete' screen.
