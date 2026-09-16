# Concepts & Glossary

A plain-English reference for the terms used across Bridge Box Scorer. See the
[Player Guide](player-guide.md) and [Director Guide](director-guide.md) for
step-by-step instructions.

---

## Games

- **Game / session** — one duplicate bridge session with an event name, date,
  and type.
- **Event type** — **Pairs** or **Teams**.
- **Record opening lead** — a per-game setting. When on, players are asked to
  enter the opening lead card as part of each result.

## Sections

- **Section** — an independent group of tables within a game (e.g. "Section A").
  A game can have one section (the common case) or several for a large event.
- Each section has its **own tables**, its **own movement**, and its **own
  timer**, chosen independently.
- Section headings only appear in the app when a game has **more than one**
  section; single-section games just show the tables.
- The leaderboard shows **each section** ranked separately, plus a **combined**
  overall ranking across all sections.

## Seats and directions

- Players sit as a **pair** in one of two directions at each table:
  - **NS** — North–South
  - **EW** — East–West
- When joining, you pick a **table** and a **direction** (NS or EW). A
  direction already taken by another pair is disabled.

## Movements

- **Movement** — the schedule that says which pairs meet, at which table, on
  which boards, in each round. Common types include **Mitchell** and
  **Howell**.
- In the picker, movements are grouped by **how many boards a pair plays**,
  which effectively sets the **session length**.
- **Round** — one segment of play; a pair plays a fixed set of boards, then
  moves.
- **Swiss Pairs** — a movement where the schedule isn't fixed in advance.
  Everyone plays the same boards each round; then, based on the current
  standings, the director draws the next round so close-ranked pairs meet, and
  no two pairs play each other twice where it can be avoided. Only the first
  round is set at the start — the director draws each later round once the
  current one is fully scored. Swiss Pairs runs as a single group of tables
  (one section).
- **Swiss Teams** — the teams version of Swiss. A **team** is simply the two
  pairs sitting at one table: the North/South pair and the East/West pair — no
  separate team sign-up is needed. Each round two teams play the same boards
  against each other in two rooms: each team's North/South pair stays at their
  home table while their other pair goes to the opponents' table. The first
  round is a random draw; the director draws each later round from the
  standings, avoiding repeat opponents. Swiss Teams runs as a single group of
  tables (one section) and needs an **even number of teams**.
- **Stationary pair** — a pair that stays at the same table and direction for
  the whole event, with their opponents coming to them. In Swiss Pairs the
  director can mark pairs as stationary on the Tables step.
- **Sit-out** — with some table counts a pair has no opponents in a round and
  sits it out. The app shows a sit-out screen and directs the pair where to go
  next. In Swiss Pairs, an odd number of pairs means one pair sits out (a
  **bye**) each round; no pair is given more than one bye, and a pair on a bye
  is credited an above-average score so the break doesn't hurt their standing.

## Results

- **Contract** — level + suit + declarer + doubling (e.g. `4♠ by South,
  doubled`).
- **Pass Out** — the board was passed in (no contract).
- **Not Played** — the board was not played.
- **Confirmation** — a board is only recorded once **both** pairs at the table
  submit the same board and result. This mutual check catches entry errors.
- **Mismatch** — the two pairs entered different details; they resolve it and
  one side re-enters.
- **Override / correction** — a director can change a recorded result from the
  **Travellers** screen.
- **Adjusted score** — a director-assigned result such as a percentage split
  (e.g. 60/40) instead of a normal contract.

## Travellers and leaderboards

- **Traveller** — the collection of all results for a single **board** played
  around the room, scored so you can compare each table's outcome.
- **Leaderboard** — the overall standings for the game, updated live as results
  confirm.
- **Scoring methods:**
  - **MP** — matchpoints, usually shown as a percentage.
  - **IMP** — International Match Points.
  - **XIMP** — Cross-IMPs.
  - Teams games use team match / overall scoring.
- **Victory Points (VP)** — how a **Swiss** game (Pairs or Teams) is ranked
  overall. Each round is turned into Victory Points on a 20-point scale, and a
  pair's or team's session result is the sum of its Victory Points across every
  round, highest total first. How a round earns its points depends on the game:
  - **Swiss Pairs on IMPs**, each round is a head-to-head match and the margin
    between the two pairs decides how the 20 points are shared.
  - **Swiss Pairs on matchpoints**, each round is scored as a percentage
    against the whole field, and that percentage sets the pair's Victory Points.
  - **Swiss Teams**, each round is a match between two teams played over the
    same boards in two rooms; the two rooms' results are compared, and the
    winning margin decides how the 20 points are shared between the teams.

  The Swiss leaderboard shows each pair or team with a column per round, so you
  can see the points won in each one. The round in progress shows a live
  running estimate — it starts at 10 (an even, average result) and updates as
  each table's results come in, so treat it as a guide that can still move until
  the round is complete. Rounds that have not been drawn yet stay blank.

## Director access

- The person who **creates** a game becomes its director automatically on that
  device — there is **no director PIN**.
- **Share code** — a short code a director generates so a co-director can claim
  director access on another device.
- Access is stored **per device, per game**, so one device can direct several
  games at once and co-directors keep access on their own devices.

## The timer

- **Phases:**
  - **Play** — time to play the round's boards.
  - **Move** — changeover between rounds.
  - **Break** — a scheduled pause after a round.
  - **Finished** — the session is over.
- **Timing mode** — **Per Round** (one play period per round) or **Per Board**
  (play time per board × boards).
- **Warning** — the play clock turns red for the last few seconds (a
  director-set number of seconds before play ends).
- **Breaks** — scheduled after a given round, set either by a fixed **duration**
  or by a **resume-at** clock time.
- **Per section** — each section runs its own timer, so sections can be timed
  independently. Every device shows the same countdown for a given section, so
  all screens stay in step.

## Devices and settings

- **Bridge Box** — the appliance you plug in at the venue to run the app. When
  switched on it creates its own local network; players and directors connect
  their phones or tablets to that network to use the app.
- **Bridge Box network** — the local network the Bridge Box creates for phones
  and tablets to join. It works with no internet at the venue.
- **Admin key** — a secret that protects the Bridge Box's settings (WiFi, club
  info). Not needed to run a game.
- **Cloud services** — subscription features that use the Bridge Box's internet
  connection: publishing results to the BridgeBox website, receiving device
  updates, and backing up the Bridge Box's data. Running a session at the venue
  does not need them.
- **USEBIO** — the standard XML results format exported at the end of a session
  for the EBU or a scoring program.
