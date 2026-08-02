# Director Guide

This guide explains how to use Bridge Box Scorer as a director. You will use this app to create games, manage movements, control the timer, and correct results if needed.

## Creating a Game

### Step 1: Open the create game form

From the main menu, tap **Create New Game**.

![Main menu](screenshots/main-menu.png)

### Step 2: Fill in the details

You will see a form with the following fields:

| Field | Description |
|-------|-------------|
| **Event Name** | The name of your event (e.g. "Monday Pairs", "Club Championship") |
| **Director Name** | Your name |
| **Event Type** | Choose "Pairs" or "Teams" |
| **Tables** | How many tables you expect (you can add or remove tables later) |

Tap **Next** when done.

![Create game form](screenshots/create-game.png)

### Step 3: Tables view

You will now see the **tables view**. This shows each table with the four seats. As players join and sit down, their names will appear here.

From this screen you can:
- **Add a table** — if more players arrive
- **Remove a table** — if a table is no longer needed (only possible if the last table is empty)
- **Evict a pair** — if someone sat in the wrong seat (tap on them and confirm)

![Tables view](screenshots/tables-view.png)

### Step 4: Select a movement

When all players are seated, tap **Select Movement**. You will see the available movements for your number of tables.

#### Generated Movements (Mitchell)

At the top you will see automatically generated Mitchell movements. You can adjust the **boards per round** using the stepper control.

- **Standard Mitchell** — for an odd number of tables
- **Mitchell Share and Relay** — for an even number of tables
- **Skip Mitchell** — for an even number of tables (alternative)

#### Database Movements (Howell etc.)

Below the generated movements, you will see other movement options stored in the database, such as Howell movements.

Each movement card shows:
- The movement name
- Number of rounds
- Boards per round
- Total boards

Tap a movement to see its full detail — a table showing which pairs sit where in each round and which boards they play.

Tap **Select** to confirm your choice.

![Movement selection](screenshots/movement-selection.png)

---

## Managing a Game

### Accessing the Director Menu

To manage a game that is already running:

1. From the main menu, tap **Manage Games**
2. Select your game from the list
3. If this is your first time managing this game on this device, you will need to enter the **share code** (see below)
4. You will see the **Director Menu**

![Director menu](screenshots/director-menu.png)

### Director Menu Options

| Option | What it does |
|--------|-------------|
| **Create/Amend Timer** | Set up and control the round timer |
| **Travellers** | View all results entered so far (by board) |
| **Change Game Status** | Change the game status (e.g. mark as complete) |
| **Movement** | View or change the movement |
| **Download USEBIO** | Export results in USEBIO format for uploading to the EBU |
| **Delete Game** | Permanently delete the game (cannot be undone) |

---

## The Timer

The timer helps players know how long they have left in each round.

### Setting Up the Timer

From the Director Menu, tap **Create/Amend Timer**. You will see:

- **Boards per Round** — how many boards in each round
- **Total Rounds** — the total number of rounds
- **Timing Mode** — either "Per Round" (one timer per round) or "Per Board" (time per board × boards = round time)
- **Play Duration** — minutes and seconds for the playing period
- **Move Duration** — minutes and seconds for the changeover period

The app shows you:
- **Session Length** — total estimated time for the whole session
- **Preview End** — estimated finish time based on current time

Tap **Create** to start the timer session.

### Controlling the Timer

Once created, you can:
- **Start** — begins the countdown
- **Pause** — pauses the timer (e.g. for a director ruling)
- **Apply Changes** — updates the timer settings without resetting

### The Timer Display

Players can view the timer by going to Join Game → Show Timer. The display shows:
- A large countdown clock
- The current round number
- Whether it is playing time or changeover time
- The projected end time of the session

The timer display has a black background with large white numbers, designed to be visible across the room.

---

## Correcting Results

If a mistake was entered, you can correct it:

1. From the Director Menu, tap **Travellers**
2. Select the **board number** you want to correct
3. You will see all instances of that board (each table/round where it was played)
4. Tap the instance you want to correct
5. Enter the correct contract and result
6. Submit the correction

Corrected results will show an "overridden" badge.

![Select board](screenshots/select-board.png)

---

## Sharing Director Access

If you need another person to help direct (e.g. a co-director), you can share access:

1. From the tables view, tap **Share Director Access**
2. A 6-character code will appear on your screen
3. Give this code to the other director
4. They go to Manage Games → select your game → enter the code
5. The code expires after 5 minutes — generate a new one if needed

The other director will then have full access to manage the game from their device.

---

## Downloading Results

At the end of the session:

1. Go to the Director Menu
2. Tap **Download USEBIO**
3. The file will be saved in the standard USEBIO XML format
4. Upload this file to the EBU website or your scoring program

---

## Settings (WiFi)

If your Bridge Box device needs to connect to a different WiFi network:

1. Tap the **Settings** cog icon (top right of the main menu)
2. Enter the device PIN when prompted
3. Select a WiFi network from the dropdown
4. Enter the WiFi password
5. Tap **Test Connection** to verify it works
6. If successful, tap **Save & Apply**

The device will restart its network connection. This may take a moment.

---

## Tips for Directors

- **Set up before players arrive** — create the game and have the tables ready so players can sit down straight away
- **Check the timer** — make sure the timer is configured before starting play
- **Use Share Director Access** — if you need to leave the room, another person can manage from their phone
- **Monitor from Manage Games** — you can check results during play without disturbing players
- **USEBIO export** — remember to download at the end so you can submit to the EBU
