# Product: Bridge Box Scorer

A real-time scoring application for bridge clubs, designed to run on a local "Bridge Box" device during club sessions.

## Core Purpose

Manages and scores duplicate bridge games. Directors create and configure games; players at each table enter their results in real time. Final scores and rankings are computed and displayed at the end of a session.

## Game Formats Supported

- **Pairs** — the primary format; NS/EW pairs compete across multiple boards
- **Individual** — players rotate individually
- Teams (infrastructure present but less prominent)

## Key User Roles

- **Director** — creates games, assigns movements, oversees play, can override results
- **Players** — join a game via a session key, enter contract and result for each board at their table

## Domain Vocabulary

- **Board** — a single deal played at a table in a round
- **Movement** — the pre-defined schedule of which pairs play which boards at which table in each round (e.g., Mitchell, Howell)
- **Round** — one cycle of play; a pair plays a set of boards at a table before moving
- **Contract** — the bid (level + suit + doubling + declarer), e.g. `3NTX N`
- **Result** — outcome of a board: tricks made relative to contract, expressed as a `BoardOutcome`
- **Participant** — a pair or individual registered for a game, identified by a session key
