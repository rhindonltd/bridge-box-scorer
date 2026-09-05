# Director Guide

This guide explains how to run a session as a director: creating a game,
arranging tables and sections, choosing movements, running the timer,
correcting results, and exporting to USEBIO.

You direct from your own phone or tablet, connected to the Bridge Box's
network — the same way players connect. Whoever creates a game becomes its
director on that device; to let a co-director help from another device, you
share a code (see [Sharing director access](#sharing-director-access)).

---

## Creating a game

### Step 1: Open the create form

From the home screen, tap **Create New Game**.

### Step 2: Fill in the details

| Field                   | Description                                                        |
| ----------------------- | ----------------------------------------------------------------- |
| **Event Name**          | The name of your event (e.g. "Monday Pairs").                     |
| **Director Name**       | Your name.                                                        |
| **Event Type**          | **Pairs** or **Teams**.                                           |
| **Date Played**         | The date of the session.                                          |
| **Record Opening Lead** | **Yes/No** — whether players are asked to enter the opening lead. |

Tap **Create Game**.

> **No PIN to set.** Whoever creates the game automatically becomes its
> director on the phone or tablet they used — there is no director PIN to
> choose. Director access stays on that phone or tablet; to let someone else
> direct, you share a code (see below). The number of tables, sections, and the
> movement are all chosen on the next screen, not on this form.

You are taken to the **setup** screen for the new game.

---

## Setting up the game

Setup has three tabs. You can move between them freely, and you don't have to
finish them in order.

```
Tables  →  Movements  →  Timer
```

### Tables tab

This shows each table with its four seats. As players sit down and enter their
names, they appear here.

From this tab you can:

- **Resize a section** — use the **Tables** stepper to change how many tables
  a section has.
- **Add or remove a table** — a table can only be removed if it is the last
  one and is empty.
- **Evict a pair** — if someone sat in the wrong place, tap them and confirm
  "Evict this pair from the table?".

The app also checks the setup and flags anything that would stop the game
starting. If a table isn't full, it shows which seat will **sit out** each
round so the movement still works.

When you're ready, tap **Start Game**.

### Movements tab

Here you choose the movement — the schedule of who plays whom, at which table,
on which boards.

- **Single section (the common case):** you go straight to the movement
  picker. An amber **"Add Section"** banner lets you split the game into
  multiple sections if you need to.
- **Multiple sections:** you get a section manager where you can add, rename,
  and delete sections, and choose a movement **for each section**
  independently.

The movement picker shows the recommended movements for your table count,
**grouped by how many boards a pair plays** (which effectively determines
session length). Each option is a card showing the movement name, number of
rounds, boards per round, boards per set, and a short note of pros and cons.

Tap the card whose session length and board count suit your event to select it
for the section.

### Timer tab (optional)

Here you set up the round timer **before** the game starts: phase lengths,
breaks, and the warning time. Tap **Save** to keep your settings. Setting up a
timer is never required to start a game.

Before the game starts you can only configure the timer here — you cannot run
it. If you have saved a timer, it begins automatically when you tap **Start
Game**, and from then on you control it (start, pause, adjust) from the Manage
Game Menu. See [The timer](#the-timer).

---

## Managing a running game

### Opening the director menu

1. From the home screen, tap **Manage Games**.
2. Tap your game in the list.
3. If you created the game on this device, you go straight to the **Manage
   Game Menu**.
4. If you are managing from a **different** device for the first time, you are
   asked for a **share code** — enter it to claim director access (see
   [Sharing director access](#sharing-director-access)).

### The Manage Game Menu

| Option                     | What it does                                                              |
| -------------------------- | ------------------------------------------------------------------------- |
| **Set Up Game**            | Returns to the Tables / Movements / Timer setup tabs.                     |
| **Travellers**             | View results by board and correct any that were entered wrong.            |
| **Movement**               | View or change the movement.                                              |
| **Share Director Access**  | Generate a code so a co-director can manage from another device.          |
| **Download USEBIO**        | Export the results as a USEBIO XML file for the EBU or a scoring program. |
| **Delete Game** *(red)*    | Permanently delete the game. This cannot be undone.                       |

The **timer** is reached through **Set Up Game → Timer tab**. Before the game
starts this shows the timer setup (configure and **Save**); once the game is in
progress the same place shows the live timer controls (start, pause, adjust).

---

## The timer

The timer shows players how long is left in each phase and, on the
[Room Display](room-display-guide.md), a large countdown for the whole room.

### Setting it up

Before the game starts, set the timer up on the **Timer** tab. The configuration
has:

- **Boards / Round** and **Total Rounds**.
- **Timing Mode** — **Per Round** (one play period per round) or **Per Board**
  (play time per board × boards = the round's play time).
- **Play Duration** — minutes and seconds for playing.
- **Move Duration** — minutes and seconds for the changeover between rounds.
- **Warning at** — how many seconds before the end of play the display should
  turn red as a warning.
- **Breaks** — see below.

The panel previews the **session length** and an estimated **finish time**.

Tap **Save** to keep your settings. The timer does not start yet: it begins
running automatically when you tap **Start Game**. You can come back and change
the settings any time before you start.

### Breaks

Tap **+ Add break** to schedule a break **after a given round**. Each break is
either:

- **Duration** — a fixed number of minutes, or
- **Resume at time** — a wall-clock time (HH:MM) to resume; the app shows the
  approximate break length.

If a break is set to resume before play could realistically finish, the app
flags it as an invalid break so you can fix it.

### Controlling a running timer

Once the game has started, open **Set Up Game → Timer** from the Manage Game
Menu to control the live timer. You get:

- **Apply Changes** — update the running timer with your edited settings
  without resetting it.
- **Start / Pause** — one button that toggles depending on the current state.
- **‹ Prev** and **Next ›** — move to the previous or next phase.
- **Adjust current phase** — **−1m / −15s / +15s / +1m** buttons, with a
  checkbox **"Apply to all subsequent phases of this type"** to apply the
  same adjustment to every future phase of that kind.

The status panel shows the current phase, time remaining, current round, and
the projected end time.

---

## Correcting results

If a board was entered incorrectly, you can override it:

1. From the Manage Game Menu, tap **Travellers**.
2. Choose the **board number** to correct.
3. You see every instance of that board (each table/round it was played at),
   live. Tap the line you want to fix.
4. Enter the correct result step by step, the same way players enter one
   (contract, or **Pass Out** / **Not Played**). You also get an extra
   **Adjusted Score** option for assigning a result such as a percentage split
   (for example 60/40).
5. The correction is saved, and anyone viewing that board sees the updated
   result.

---

## Sharing director access

If a co-director needs to help manage the game from their own phone or tablet,
share access with a short code:

1. From the Manage Game Menu, tap **Share Director Access**.
2. A short share code appears on screen.
3. The other person opens **Manage Games**, taps the same game, and enters the
   code on the **Claim Director Code** screen.
4. They now have full director access to that game from their device.

Director access is stored per device and per game, so several games can be
directed from the same device at once, and a co-director keeps access on their
own device.

---

## Downloading results (USEBIO)

At the end of the session:

1. Open the Manage Game Menu and tap **Download USEBIO**.
2. The results are exported as a standard **USEBIO XML** file.
3. Upload that file to the EBU or import it into your scoring program.

---

## Tips for directors

- **Set up before players arrive** — create the game and open the Tables tab so
  players can sit down straight away.
- **Odd number of pairs?** A sit-out is handled for you — the app shows which
  seat sits out each round, so you can start with a half table.
- **Use sections** for large events — each section gets its own tables and
  movement, and the leaderboard shows both per-section and combined standings.
- **Share access** so a co-director can help — they manage from their own phone
  after claiming your share code.
- **Export at the end** — remember to download the USEBIO file before deleting
  or reusing the game.

For the shared-screen timer and leaderboard, see the
[Room Display Guide](room-display-guide.md). For the Bridge Box's WiFi, club
details, and admin key, see the [Settings Guide](settings-guide.md).
