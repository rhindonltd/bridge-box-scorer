# Manual End-to-End Test Plan — Bridge Box Scorer (on the appliance)

This is a **press-this-button** checklist for manually testing the app end to
end on a real **Bridge Box**. It is written so you can hand it to someone who
has never seen the app and they can execute it exactly, ticking each box.

The goal is **100% confidence the app works correctly** on the appliance — the
place automated tests can't fully reach (real network, real devices, real
multi-device sync, timer wall-clock, WiFi, and the new Cloud Backup screen).

---

## How to use this document

- Every step names the **exact button/label** to tap, in `**bold**`. Labels are
  quoted verbatim as they appear on screen.
- **Expected result** lines say what you should see. If reality differs, the
  step **fails** — note it in the Result column.
- Tick `[ ]` → `[x]` as you go. Each check has an ID (e.g. `HOME-1`) so you can
  report failures precisely.
- **Devices:** you need at least **three** devices to test properly — one acting
  as **Director**, and **two more as a pair of players** (so you can prove the
  dual-side confirmation and live sync). A fourth device as a **Room Display** is
  recommended. Phones and/or tablets are all fine.
- "Tap" = touch/click. On a laptop it's a click.

### Before you start — environment

| Check | Action | Expected |
|---|---|---|
| ☐ ENV-1 | Switch the Bridge Box on and wait ~1 minute. | It powers up. |
| ☐ ENV-2 | On each test device, open WiFi settings and join the **Bridge Box's own network** (the network it broadcasts). | Device connects; no internet needed. |
| ☐ ENV-3 | On each device, open the browser and go to the address your box shows (e.g. `http://bridgebox.local` or the printed IP). | The **home screen** with the Bridge Box logo loads. |
| ☐ ENV-4 | In the browser, open `/<address>/healthz`. | JSON with `"status":"ok"` and a version. If `error`/503, **stop** — the box isn't healthy. |
| ☐ ENV-5 | Note the **version** shown at the bottom of the home screen. | It matches the release you intend to test. |

> Tip: label your devices with tape — "DIRECTOR", "NS", "EW", "DISPLAY" — so the
> steps below are unambiguous.

---

## Test data you'll reuse

Pick simple, memorable names so mismatches are obvious:

- Event name: **"Manual Test Pairs"**
- Director name: **"Test Director"**
- Player names: **"Alice North" / "Bob South"** (NS pair), **"Carol East" /
  "Dave West"** (EW pair). You can type guests if the EBU database isn't loaded.

---

# Part 1 — Home & navigation (DIRECTOR device)

| Check | Step | Expected |
|---|---|---|
| ☐ HOME-1 | On the home screen, confirm four buttons are present: **Join Game**, **Create New Game**, **Manage Games**, **Room Display**. | All four visible. |
| ☐ HOME-2 | Confirm the **⚙ Settings cog** is top-right. | Present. |
| ☐ HOME-3 | Tap **Join Game**. | A "Select Game" style list (or "no games" state). |
| ☐ HOME-4 | Tap the back arrow (top-left, "Go back"). | Returns to home. |
| ☐ HOME-5 | Tap **Manage Games**, then back. | List (likely empty) then home. |
| ☐ HOME-6 | Tap **Room Display**, then back. | "Display Game" list then home. |

---

# Part 2 — Create a game (DIRECTOR device)

| Check | Step | Expected |
|---|---|---|
| ☐ CREATE-1 | From home tap **Create New Game**. | The **"Create Game"** form. |
| ☐ CREATE-2 | In **Event Name**, type `Manual Test Pairs`. | Text entered. |
| ☐ CREATE-3 | In **Director Name**, type `Test Director`. | Text entered. |
| ☐ CREATE-4 | **Event Type**: leave on **Pairs**. | "Pairs" selected. |
| ☐ CREATE-5 | **Scoring**: confirm options are **Matchpoints** and **Cross-IMPs**; leave on **Matchpoints**. | Correct options. |
| ☐ CREATE-6 | **Record Opening Lead**: set the toggle to **No** (keeps entry short for the test). | Toggle reads "No". |
| ☐ CREATE-7 | **Allow Hand Entry**: set the toggle to **Yes** (so we can test deal entry later). | Toggle reads "Yes". |
| ☐ CREATE-8 | Tap **Create Game** (bottom). | You land on the **setup** screen for the new game (Tables view). |
| ☐ CREATE-9 | **Validation check:** create a second game but leave **Event Name** blank, then tap **Create Game**. | A red error message appears; no game is created. Then go back. |

> If your club has **BridgeWebs** configured and has events for today, a **Use
> BridgeWebs Event** toggle appears above Event Name. Optional: toggle it **Yes**,
> confirm a dropdown ("— Select an event —") lists events, pick one, and confirm
> the name prefills. Toggle **No** to type freely.

---

# Part 3 — Set up the game (DIRECTOR device)

You should be on the setup screen with tabs reachable from the header **Setup
menu**: **Tables**, **Movement**, **Timer**.

## 3a. Tables

| Check | Step | Expected |
|---|---|---|
| ☐ SETUP-1 | On the **Tables** view, use the **Tables** stepper (+/−) to set the count to **2**. | Card reads "2 tables". |
| ☐ SETUP-2 | Confirm a banner prompts you to choose a movement, e.g. **"Select a movement for this section."** | Banner visible (no movement yet). |
| ☐ SETUP-3 | Tap a table card to open the **"Table {n}"** dialog. | Dialog shows "North / South" and "East / West" rows (empty). |
| ☐ SETUP-4 | Tap **Done** to close. | Dialog closes. |

## 3b. Movement

| Check | Step | Expected |
|---|---|---|
| ☐ SETUP-5 | Open the **Movement** view from the Setup menu. | Movement picker with recommendation cards grouped by "{n} boards". |
| ☐ SETUP-6 | Tap a movement card (e.g. a Mitchell or Howell). | A preview dialog opens titled with the movement name, showing the round/table breakdown. |
| ☐ SETUP-7 | Tap **Select Movement**. | Dialog closes; the section now shows "Movement: {name}". |
| ☐ SETUP-8 | Back on **Tables**, confirm each table now shows the **boards to put out** (e.g. "Boards 1–3"). | Board guidance appears. |

## 3c. Timer (optional but test it)

| Check | Step | Expected |
|---|---|---|
| ☐ SETUP-9 | Open the **Timer** view. | Timer config: "Timing" (Per Round / Per Board), "Play Duration", "Move Duration", "Warning at…". |
| ☐ SETUP-10 | Set **Play Duration** to **0 min 30 sec** and **Move Duration** to **0 min 15 sec** (short, so you can watch it run during the test). | Values update. **Note:** the timer config **auto-saves** — there is no Save button. |
| ☐ SETUP-11 | Tap **+ Add break**, set it to fire **after round 1** with a **Duration** of 1 minute. | A break row appears; no "invalid break" warning. |
| ☐ SETUP-12 | Remove the break (**Remove**) if you don't want it, or keep it to test breaks later. | Break removed/kept as chosen. |

Leave setup here — you'll **Start Game** after the players are seated (Part 4).

---

# Part 4 — Players join and take seats (NS + EW devices)

Do these on the **two player devices**. Keep the DIRECTOR device on the Tables
view so you can watch seats fill live.

## 4a. NS device

| Check | Step | Expected |
|---|---|---|
| ☐ JOIN-1 | On the NS device home screen, tap **Join Game**. | Game list. |
| ☐ JOIN-2 | Tap **"Manual Test Pairs"**. | "Select Seat" screen: instruction "Please select the table and direction you are sitting:" with "Table 1"/"Table 2" cards. |
| ☐ JOIN-3 | On **Table 1**, tap **NS**. | A name panel slides up titled "Table 1" with **North** and **South** fields. |
| ☐ JOIN-4 | In **North** type `Alice North`; if a search list appears pick the match or the guest option ("Add guest: …"). Repeat for **South** = `Bob South`. | Both names filled. |
| ☐ JOIN-5 | Tap **Enter Pair**. | You're seated; the play flow begins (Round 1 info). |
| ☐ JOIN-6 | **On the DIRECTOR device**, watch Table 1. | Alice/Bob appear on Table 1 **live**, without refreshing. |

## 4b. EW device

| Check | Step | Expected |
|---|---|---|
| ☐ JOIN-7 | On the EW device, tap **Join Game → "Manual Test Pairs"**. | Seat picker. Table 1 **NS** is now greyed out/taken. |
| ☐ JOIN-8 | On **Table 1**, tap **EW**. Enter **East** = `Carol East`, **West** = `Dave West`. Tap **Enter Pair**. | Seated. |
| ☐ JOIN-9 | Seat a second pair on **Table 2** as well (use either player device to join twice, or extra devices). You need both tables seated for the movement to start cleanly. | Table 2 NS and EW seated. |
| ☐ JOIN-10 | **DIRECTOR device:** confirm all four seats on both tables are filled. | Full seating shown live. |

> **Sit-out note:** if you deliberately leave a seat empty, the app should show
> which seat **sits out** each round. Optional to test here.

---

# Part 5 — Start the game (DIRECTOR device)

| Check | Step | Expected |
|---|---|---|
| ☐ START-1 | Open the **Start Game** step from the Setup menu. | A readiness panel. |
| ☐ START-2 | Confirm it reads ready, e.g. **"Everything's ready"**. | Ready state (no blocking issues listed). |
| ☐ START-3 | Tap **Start Game**. | The game starts; you're taken to the **Manage Game Menu**. If you set a timer, it begins running. |
| ☐ START-4 | **NS & EW devices:** confirm they move into round play (Round 1 info). | Players see "Table 1, Round 1". |

---

# Part 6 — Play a board with dual-side confirmation (NS + EW devices)

This is the heart of the app — enter the **same** board on both sides and watch
it confirm.

## 6a. Enter a normal contract (matching)

| Check | Step (NS device) | Step (EW device) | Expected |
|---|---|---|---|
| ☐ PLAY-1 | Tap **Enter Round**. | Tap **Enter Round**. | Both enter the contract wizard. |
| ☐ PLAY-2 | If asked, tap the first **board number**. | Same board. | Wizard shows "Enter Contract". |
| ☐ PLAY-3 | **Level:** tap **4**. | **Level:** tap **4**. | Moves to Suit. |
| ☐ PLAY-4 | **Suit:** tap **4♠**. | **Suit:** tap **4♠**. | Moves to Declarer. |
| ☐ PLAY-5 | **Declarer & double:** leave doubling **None**; tap the **South** declarer button. | Same: **None**, **South**. | Moves to Result. |
| ☐ PLAY-6 | **Result:** tap **Made**, then **=**. | Same: **Made**, **=**. | Moves to Confirm. |
| ☐ PLAY-7 | **Confirm:** check the summary reads `4♠ by South, Made`; tap **Submit**. | Tap **Submit**. | See below. |
| ☐ PLAY-8 | After NS submits first, NS shows **"Waiting for confirmation"**. | EW then submits the matching result. | Once both submit, the board **confirms**. |
| ☐ PLAY-9 | Both devices now show the **Board Results** (traveller) for that board. | — | Traveller table appears. |

## 6b. Force a mismatch (proves the safety check)

| Check | Step | Expected |
|---|---|---|
| ☐ PLAY-10 | On the next board, NS enters **Made =** and EW enters **Down −1** (deliberately different). | After both submit, both see **"Results Don't Match"** showing what each side entered. |
| ☐ PLAY-11 | Tap **Re-enter Result** on one device and enter the value matching the other side. | The board confirms once they agree. |

## 6c. Pass Out / Not Played shortcuts

| Check | Step | Expected |
|---|---|---|
| ☐ PLAY-12 | On another board, at the **Level** step tap **Pass Out** on both sides. | Jumps to Confirm; submitting on both confirms as "Pass Out". |
| ☐ PLAY-13 | On another board, tap **Not Played** on both sides. | Confirms as "Not Played". |

## 6d. Finish the round and move

| Check | Step | Expected |
|---|---|---|
| ☐ PLAY-14 | After the last board of the round, tap **Next Board** / on the final board **Next Round**. | Advances. |
| ☐ PLAY-15 | If **Allow Hand Entry** is on, an **"Enter cards"** step may appear. Enter a full deal (tap the four hands, 13 cards each) and tap **Save cards**, or tap **Skip**. | Cards saved or skipped; never blocks the move. |
| ☐ PLAY-16 | A **"Move Info"** screen tells you which table/direction to go to next. Tap **Continue**. | Advances to the next round's info. |
| ☐ PLAY-17 | Play through the remaining rounds the same way. | Each round confirms and advances. |
| ☐ PLAY-18 | After the final round, the device shows the **leaderboard** with your pair highlighted. | Final standings shown. |

---

# Part 7 — Live sync & Room Display (DISPLAY device + watching)

| Check | Step | Expected |
|---|---|---|
| ☐ DISP-1 | On the DISPLAY device, home → **Room Display**. | "Display Game" list. |
| ☐ DISP-2 | Tap **"Manual Test Pairs"**. | **"Display Menu"** with **Timer** and **Leaderboard**. |
| ☐ DISP-3 | Tap **Leaderboard**. For a matchpoint pairs game you're first asked **"Show standings as"** — tap **Percentage** (or **Matchpoints**). | Full-screen live standings. |
| ☐ DISP-4 | Enter or correct a result on a player device. | The display updates **automatically** within a couple of seconds — no refresh. |
| ☐ DISP-5 | Go back and tap **Timer** (if you set one). | Full-screen MM:SS countdown on black. |
| ☐ DISP-6 | Watch the play clock reach the **warning** period. | Clock turns **red / pulses** in the final seconds. |
| ☐ DISP-7 | Let a play phase end. | It switches to the **move** (changeover) colour, then the next play phase. |
| ☐ DISP-8 | If you scheduled a **break**, reach it. | Shows a tea-cup icon and "Next round starts at …". |

---

# Part 8 — Timer controls while running (DIRECTOR device)

Open **Manage Game Menu → Set Up Game → Timer** (once started this shows the
live controls, header "Timer Controls").

| Check | Step | Expected |
|---|---|---|
| ☐ TIMER-1 | Confirm the status panel shows **Status**, **Remaining**, **Round**, **Live End**. | All present. |
| ☐ TIMER-2 | Tap **Pause**. | Countdown stops; the display device shows **PAUSED**; the button now reads **Start**. |
| ☐ TIMER-3 | Tap **Start**. | Countdown resumes; PAUSED clears; button reads **Pause**. |
| ☐ TIMER-4 | Tap **+1m**. | Remaining increases by 1 minute (display updates too). |
| ☐ TIMER-5 | Tap **−15s**. | Remaining decreases by 15 seconds. |
| ☐ TIMER-6 | Tick **"Apply to all subsequent phases of this type"**, then **+1m**. | Future phases of that type also shift (verify on the next phase). |
| ☐ TIMER-7 | Tap **Next ›**. | Advances to the next phase. |
| ☐ TIMER-8 | Tap **‹ Prev**. | Goes back a phase. |
| ☐ TIMER-9 | Confirm **every device** (players + display) shows the same time as the director's changes take effect. | All screens stay in step. |

---

# Part 9 — Director corrections (DIRECTOR device)

## 9a. Travellers / override

| Check | Step | Expected |
|---|---|---|
| ☐ CORR-1 | Manage Game Menu → **Travellers**. | **"Select Board"** grid. |
| ☐ CORR-2 | Tap a board number that has results. | **"Travellers"** — every instance of that board, with columns "NS", "EW", "Contract". |
| ☐ CORR-3 | Tap a result **row**. | The director contract wizard opens (marked "Director"), starting at the Level step. |
| ☐ CORR-4 | Enter a corrected contract and **Submit**. | The correction saves; the traveller updates. |
| ☐ CORR-5 | **On a player device** viewing that board, confirm the corrected result appears live. | Updates without refresh. |

## 9b. Adjusted score

| Check | Step | Expected |
|---|---|---|
| ☐ CORR-6 | On a board row (Travellers), open the wizard and at the Level step tap **Adjusted Score**. | The **"Adjusted Score"** screen with presets (e.g. "AVE (50/50)", "AVE+ / AVE- (60/40)") and a **Custom** option. |
| ☐ CORR-7 | Pick **AVE+ / AVE- (60/40)** (or Custom, set NS 60 / EW 40) and **Submit**. | Saved as an adjusted result; shows on the traveller. |

## 9c. Enter deals (director)

| Check | Step | Expected |
|---|---|---|
| ☐ CORR-8 | Manage Game Menu → **Enter Deals** → **Select Board** → pick a board. | Deal entry: direction tabs "North/East/South/West", each "{count}/13". |
| ☐ CORR-9 | Lay out all four hands (52 cards). | **Save deal** becomes available. |
| ☐ CORR-10 | Tap **Save deal**. | Saved; a **Show hand** button now appears on that board's traveller for everyone. |

---

# Part 10 — Share director access (DIRECTOR + a second device)

| Check | Step | Expected |
|---|---|---|
| ☐ SHARE-1 | Manage Game Menu → **Share Director Access**. | A 6-character **share code** with a countdown ("Expires in m:ss"). |
| ☐ SHARE-2 | On a **second** device: **Manage Games → "Manual Test Pairs"**. | Because this device isn't a director yet, the **"Claim Director Code"** screen appears. |
| ☐ SHARE-3 | Enter the code and tap **Claim Access**. | The second device gains full director access (lands on the Manage Game Menu). |
| ☐ SHARE-4 | Enter a bogus code on a fresh attempt. | Rejected with an error; no access granted. |
| ☐ SHARE-5 | Tap **Generate New Code** on the first device. | A new code replaces the old one; the old code no longer works. |

---

# Part 11 — Change device / seat transfer (player devices)

| Check | Step | Expected |
|---|---|---|
| ☐ XFER-1 | On the NS device play screen, open the **Menu** (top-right) → **Change device**. | A short code + "Once the code is used, this device will be signed out of the seat." |
| ☐ XFER-2 | On a spare device: **Join Game → "Manual Test Pairs"**, then use the seat-transfer entry ("Move a seat to this device") to enter the code and tap **Take over seat**. | The spare device takes the NS seat and lands on the play screen. |
| ☐ XFER-3 | The original NS device is signed out of the seat. | It no longer controls that seat. |
| ☐ XFER-4 | Open the **Menu → Pair details** on the active device. | Shows pair number, direction, and both names. Tap **Done**. |

---

# Part 12 — Export results (DIRECTOR device)

| Check | Step | Expected |
|---|---|---|
| ☐ EXP-1 | Play/confirm **all** results (or use the corrections to fill any gaps) so the game is complete. | All results in. |
| ☐ EXP-2 | Manage Game Menu → **Download USEBIO**. (It stays disabled until all results are in.) | A **USEBIO XML** file downloads. |
| ☐ EXP-3 | If deals were entered, Manage Game Menu → **Download PBN**. | A `.pbn` file downloads with board/deal tags. |
| ☐ EXP-4 | Open each downloaded file. | Non-empty; contains the event and board data. |

> If BridgeWebs is configured, **Upload to BridgeWebs** also appears (disabled
> until all results are in). Optional: tap it and confirm a success message.

---

# Part 13 — Settings (DIRECTOR device) — includes the new Cloud Backup screen

Open **Settings** via the **⚙ cog** on the home screen. Protected screens ask
for the **admin key** once per device.

## 13a. Admin unlock

| Check | Step | Expected |
|---|---|---|
| ☐ SET-1 | Tap the **⚙ cog**. | The **Settings** menu, or an **"Admin Access"** prompt. |
| ☐ SET-2 | If prompted, enter the **admin key** (on the label under the device) and tap **Unlock**. | Settings menu appears. |
| ☐ SET-3 | Confirm the menu lists: **WiFi Settings**, **Club Information**, **BridgeWebs**, **Cloud Backup**, **Update Admin Key**, and **Log Out**. | All present. |

## 13b. WiFi

| Check | Step | Expected |
|---|---|---|
| ☐ SET-4 | Tap **WiFi Settings** (header reads "Wifi Settings"). | Network dropdown, a **Rescan** link, a password field, **Test Connection**, **Save & Apply**. |
| ☐ SET-5 | Tap **Rescan**. | The list repopulates with nearby networks. |
| ☐ SET-6 | Pick a network, type its **password**, tap **Test Connection**. | Tests the credentials; **Save & Apply** stays disabled until a test succeeds. |
| ☐ SET-7 | On a **successful** test, tap **Save & Apply**. | The box connects out to that network. *(This drops the client hotspot briefly — expected on real hardware.)* |

## 13c. Club Information

| Check | Step | Expected |
|---|---|---|
| ☐ SET-8 | Tap **Club Information**. | "Club Name" and "EBU Club Number" fields. |
| ☐ SET-9 | Enter your club details and tap **Save**. | Saved; these appear in exported USEBIO files. |

## 13d. Cloud Backup (the feature under focus)

| Check | Step | Expected |
|---|---|---|
| ☐ CLOUD-1 | Tap **Cloud Backup**. | Header **"Cloud Backup"**. |
| ☐ CLOUD-2 | **If cloud backup is NOT enabled on this box:** confirm the copy reads that it's not enabled, e.g. **"Cloud backup is not enabled on this box…"**, and **no "Back up now" button** is shown. | Correct disabled state. |
| ☐ CLOUD-3 | **If cloud backup IS enabled:** confirm a **"Games backed up"** panel shows either a relative time (e.g. "3 minutes ago") or **"Not yet"**, and a **Back up now** button is present. | Correct enabled state. |
| ☐ CLOUD-4 | Tap **Back up now**. | The button briefly reads **"Backing up..."** and disables; a green **"✅ Backup started"** message appears. |
| ☐ CLOUD-5 | Wait a few seconds. | The **"Games backed up"** time updates to a recent time (the box completes the sync in the background). |
| ☐ CLOUD-6 | Tap **Back up now** rapidly several times. | It stays disabled for a few seconds after a press (debounced) and does not error. |
| ☐ CLOUD-7 | **Fire-and-forget check:** confirm pressing **Back up now** never restarts the app or interrupts a running game/timer. | Nothing else changes; the game keeps running. |
| ☐ CLOUD-8 | **(If reproducible)** With the box's internet unplugged, trigger a backup and wait. | A soft warning appears (e.g. "Last backup didn't complete (the box was offline). It will retry automatically."), **not** a hard error. |

## 13e. Admin key + logout

| Check | Step | Expected |
|---|---|---|
| ☐ SET-10 | Tap **Update Admin Key**, enter a **New Admin Key** and matching **Confirm Admin Key**, tap **Update Key**. | Saved. *(Remember the new key!)* |
| ☐ SET-11 | Return to the Settings menu and tap **Log Out**. | Settings re-lock. |
| ☐ SET-12 | Open a protected setting again. | The **admin key** prompt returns (proving logout worked). Enter the new key to confirm it's accepted. |

---

# Part 14 — Multi-section game (optional but recommended)

Repeat a shortened create→setup→play with **two sections** to exercise section
handling.

| Check | Step | Expected |
|---|---|---|
| ☐ SEC-1 | Create a new game. On the **Movement** view, tap **Add Section** (via the "Running more than one section?" banner). | A dialog to name the existing + new section; tap **Add**. |
| ☐ SEC-2 | Confirm section **pills** appear (Section A / Section B). Set a table count and pick a movement **for each** section. | Both sections configured independently. |
| ☐ SEC-3 | Seat both sections (players pick their table **under the correct section heading**) and **Start Game**. | Game starts across both sections. |
| ☐ SEC-4 | Open **Room Display → Leaderboard**. | It **cycles** through the combined ranking and each section's tab (~1 min each); tapping a **tab** jumps to it. |
| ☐ SEC-5 | Confirm each section's own timer can be controlled from the timer selector. | Per-section timers work independently. |

---

# Part 15 — Swiss Pairs & the Draw Next Round control (DIRECTOR + player devices)

Swiss is the flow that exercises the **Draw Next Round** control on the
**Movement** screen. That screen also shows each round's play progress
(played / total, colour-coded), so the director can see where results are still
missing before drawing. Drawing shows a **review** page of the proposed seating
(with player names) that the director can adjust — swap two pairs, reassign the
bye — and only **OK** commits it; **Cancel** discards it.

| Check | Step | Expected |
|---|---|---|
| ☐ SWISS-1 | Create a new **single-section** game (Pairs). On the **Movement** view, tap **Swiss Pairs** at the top of the picker. | Swiss setup opens. |
| ☐ SWISS-2 | Set **rounds** and **boards per round**, tap **Select Movement**. | Swiss movement selected. |
| ☐ SWISS-3 | Seat the field and **Start Game**. Only round 1 exists at this point. | Players enter round 1. |
| ☐ SWISS-4 | On the DIRECTOR device, go to **Manage Game Menu → Movement** **before** any results are in. | The **"Draw Next Round"** button appears above the movement and is **disabled**, with "Waiting for all results in the current round." |
| ☐ SWISS-5 | Look at the movement's per-round **Played** column. | Rounds show played / total, colour-coded (green = all in, yellow = partial), so outstanding rounds are visible. |
| ☐ SWISS-6 | Play and confirm **every** board of round 1. Watch the Movement screen. | The round-1 progress fills in and turns green as results confirm. |
| ☐ SWISS-7 | Once all round-1 results are in, confirm **Draw Next Round** becomes **enabled**. | Button enabled. |
| ☐ SWISS-8 | Tap **Draw Next Round**. | A **review** page opens showing each table with the two pairs' **names** for the proposed round 2 (and the sit-out pair if the field is odd). Nothing is committed yet. |
| ☐ SWISS-9 | **On a player device**, confirm it has **not** moved to round 2 yet (the draw isn't committed until you accept it). | Players still on round 1 / waiting. |
| ☐ SWISS-10 | On the review page, tap one pair then another pair. | They **swap** seats; the display updates. |
| ☐ SWISS-11 | If there's a sit-out: tap a seated pair, then the **sit-out** slot. | That pair takes the **bye**; the previously-benched pair takes the vacated seat. |
| ☐ SWISS-12 | Make an edit that repeats an earlier pairing (or reinstate one). | A **warning** appears (e.g. "a pairing repeats an earlier-round opponent") but does **not** block you. |
| ☐ SWISS-13 | Tap **Cancel**. | The review closes with **nothing saved**; you're back on the Movement screen and can draw again. |
| ☐ SWISS-14 | Tap **Draw Next Round** again, then tap **OK**. | The round is committed: a "Round 2 drawn." confirmation appears, and the new seating (as shown) now appears on **every** device. |
| ☐ SWISS-15 | Verify the committed seating matches exactly what the review page showed (including any swaps/bye change you kept). | The live round matches the reviewed seating. |
| ☐ SWISS-16 | Repeat: play round 2, then draw round 3 the same way. | Each round previews, then commits on OK. |

---

# Part 16 — Delete game & clean up (DIRECTOR device)

| Check | Step | Expected |
|---|---|---|
| ☐ DEL-1 | Manage Game Menu → **Delete Game** (red). | A confirmation prompt. |
| ☐ DEL-2 | Confirm deletion. | The game is removed; it disappears from Join/Manage lists. |
| ☐ DEL-3 | Confirm a completed/deleted game no longer appears under **Join Game**. | Not listed. |
| ☐ DEL-4 | Open an old join/play link for a **completed** game (if you have one). | You're redirected to its **leaderboard**, not the seat picker. |

---

# Part 17 — Resilience checks

| Check | Step | Expected |
|---|---|---|
| ☐ RES-1 | Mid-game, **reload** a player's browser. | It returns to the **first incomplete round**, not back to the start. |
| ☐ RES-2 | Briefly turn a player device's WiFi off and on during play. | On reconnect it re-syncs current state automatically. |
| ☐ RES-3 | Reload the **Room Display**. | It re-loads the current live standings/timer. |
| ☐ RES-4 | Put two devices on the **same board's traveller** and make a correction. | Both update live. |
| ☐ RES-5 | Check `/<address>/healthz` again at the end. | Still `"status":"ok"`. |

---

## Sign-off

| Field | Value |
|---|---|
| Tester name | |
| Date | |
| App version (from home footer) | |
| Device(s) used | |
| Overall result | ☐ Pass ☐ Pass with notes ☐ Fail |

**Failures / notes** (reference the check ID, e.g. `CLOUD-4`):

```
(record here)
```

---

## Notes on scope & known limitations

- **Scoring type is chosen on the create form.** A **Pairs** game offers
  **Matchpoints** or **Cross-IMPs**; a **Teams** game offers **IMP**, **IMP
  (Victory Points)**, and a board-comparison option (**Point-a-Board** in the
  UK / **Board-a-Match** in the US). This plan focuses on the **Pairs +
  Matchpoints** path for the richest coverage, but any of these can be selected
  when creating a game.
- **Swiss Pairs** is fully supported: to test it, create a **single-section**
  game, pick **Swiss Pairs** at the top of the movement picker, set rounds and
  boards, **Select Movement**, then during play draw each later round from the
  **Movement** screen's **Draw Next Round** button (enabled only once every
  result for the current round is in). The draw shows a **review** of the
  proposed seating that the director can edit (swap pairs, reassign the bye)
  before it commits — **OK** commits it, **Cancel** discards it.
- **Swiss Teams** now has the same **Draw Next Round** button and preview →
  **OK** / **Cancel** flow, showing the proposed **matches** (team names) plus
  any bye or triangle. The teams review is **read-only** for now (accept or
  redraw; no hand-editing yet), so it has fewer edit checks than Swiss Pairs.
- **Cloud Backup** behaviour depends on whether the box is cloud-configured and
  entitled (a subscription feature). On a box that isn't, the screen correctly
  shows the "not enabled" state and the button does nothing — that is itself a
  valid test result (CLOUD-2).
- **Accessibility:** automated checks pass, but full WCAG conformance needs
  manual testing with assistive technology (screen reader, keyboard-only) and
  expert review — out of scope for this functional plan.
```
