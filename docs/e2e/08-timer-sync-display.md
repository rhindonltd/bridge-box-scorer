# 08 — Timer, live sync & Room Display

Covers the session timer (config + live controls), live multi-device sync, the
Room Display (leaderboard + timer), and multi-section cycling.

**Devices:** DIRECTOR + at least one player + a DISPLAY device. A running game
with a timer configured (set one in [file 01](01-core-flows.md) §3c, or create
live). Some checks want a short timer (30s play / 15s move) so you can watch
phases turn over.

---

## 1. Room Display — leaderboard

| Check | Step | Expected |
|---|---|---|
| ☐ DISP-1 | DISPLAY device: home → **Room Display**. | "Display Game" list. |
| ☐ DISP-2 | Tap the game. | **"Display Menu"** with **Timer** and **Leaderboard**. |
| ☐ DISP-3 | Tap **Leaderboard**. For an MP pairs game, answer **"Show standings as"** → **Percentage**. | Full-screen live standings. |
| ☐ DISP-4 | Enter or correct a result on a player/director device. | The display updates **automatically** within a couple of seconds — no refresh. |

---

## 2. Room Display — timer

| Check | Step | Expected |
|---|---|---|
| ☐ DISP-5 | Back to the Display Menu → **Timer**. | Full-screen **MM:SS** countdown on black. |
| ☐ DISP-6 | Watch the play clock reach the **warning** period. | Clock turns **red / pulses** in the final seconds. |
| ☐ DISP-7 | Let a play phase end. | Switches to the **move** (changeover) colour, then the next play phase. |
| ☐ DISP-8 | If a **break** is scheduled, reach it. | Shows a tea-cup icon and "Next round starts at …". |

---

## 3. Timer controls while running (DIRECTOR)

Open **Manage Game Menu → Set Up Game → Timer** — once started this shows the
live controls (header "Timer Controls").

| Check | Step | Expected |
|---|---|---|
| ☐ TIMER-1 | Confirm the status panel shows **Status**, **Remaining**, **Round**, **Live End**. | All present. |
| ☐ TIMER-2 | Tap **Pause**. | Countdown stops; the display shows **PAUSED**; the button reads **Start**. |
| ☐ TIMER-3 | Tap **Start**. | Countdown resumes; PAUSED clears; button reads **Pause**. |
| ☐ TIMER-4 | Tap **+1m**. | Remaining increases by 1 minute (display updates too). |
| ☐ TIMER-5 | Tap **−15s**. | Remaining decreases by 15 seconds. |
| ☐ TIMER-6 | Tick **"Apply to all subsequent phases of this type"**, then **+1m**. | Future phases of that type also shift (verify on the next phase). |
| ☐ TIMER-7 | Tap **Next ›**. | Advances to the next phase. |
| ☐ TIMER-8 | Tap **‹ Prev**. | Goes back a phase. |
| ☐ TIMER-9 | Confirm **every device** (players + display) shows the director's changes in step. | All screens stay synchronised. |

---

## 4. Swiss timer between rounds

**Setup:** a Swiss game with a timer ([file 05](05-scoring-swiss.md)).

| Check | Step | Expected |
|---|---|---|
| ☐ TIMER-10 | Finish a round's play; before the next round is drawn, watch the timer. | It **waits** (does not auto-advance into the next round's play) — a Swiss timer parks between rounds pending the draw. |
| ☐ TIMER-11 | Commit the next round's draw (Movement → Draw Next Round → OK). | The new round's clock **starts** on commit, on every device. |

---

## 5. Multi-section game

Exercises section handling and the leaderboard's section cycling.

| Check | Step | Expected |
|---|---|---|
| ☐ SEC-1 | Create a new game. On **Movement**, use **Add Section** (via the "Running more than one section?" banner); name the existing + new section; **Add**. | Section **pills** appear (Section A / Section B). |
| ☐ SEC-2 | Set a table count and pick a movement **for each** section independently. | Both sections configured. |
| ☐ SEC-3 | Seat both sections (players pick their table under the correct **section heading**) and **Start Game**. | Game starts across both sections. |
| ☐ SEC-4 | Room Display → **Leaderboard**. | It **cycles** through the combined ranking and each section's tab (~1 min each); tapping a **tab** jumps to it. |
| ☐ SEC-5 | Confirm each section's **timer** can be controlled independently from the timer selector. | Per-section timers work independently. |
| ☐ SEC-6 | (Optional) Create a multi-section game with the **combined ranking turned off**. | Only per-section rankings show; no combined overall. |
