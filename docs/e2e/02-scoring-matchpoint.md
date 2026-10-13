# 02 — Scoring: Pairs · Matchpoints (MP)

Matchpoints is the default pairs scoring. Each board is scored by comparing your
result against every other pair that played it; your **percentage** across all
boards is your ranking. A **standard Mitchell** is a **two-winner** movement —
North/South and East/West never swap, so they form **separate fields with their
own winners**, shown as two rankings (NS and EW). A **Howell** (or an
arrow-switched Mitchell) is **one-winner** — a single pooled ranking.

**What you're verifying:** the leaderboard shows a **percentage**, the ranking
is correct best-first, and a two-winner Mitchell splits into NS and EW while a
Howell shows one field.

**Fastest setup (single device):**

```bash
npm run seed:e2e -- --scoring MP --play all          # two-winner Mitchell
npm run seed:e2e -- --scoring MP_HOWELL --play all   # one-winner Howell
```

Plant the printed director token (see [README](README.md) → Fixture setup), then
open the event. You can also play a game live via [file 01](01-core-flows.md) and
inspect the same screens.

---

## MP-A. Two-winner Mitchell — the percentage leaderboard

**Fixture:** `--scoring MP` (standard 3-table Mitchell, all boards played).

| Check | Step | Expected |
|---|---|---|
| ☐ MP-1 | Open **Room Display → Leaderboard** for the game (or **Manage Game Menu → Leaderboard**). For an MP pairs game you're first asked **"Show standings as"**. | A **Percentage** / **Matchpoints** choice appears. |
| ☐ MP-2 | Choose **Percentage**. | A standings table where each pair's score is a **percentage** (e.g. "62.5%"). |
| ☐ MP-3 | Confirm the field is split into **two rankings**: a **North/South** list and an **East/West** list (tabs or two panels). | Two separate rankings, each with its own 1st place. |
| ☐ MP-4 | Confirm each ranking is ordered **best percentage first** and positions are sensible (1, 2, 3…). | Correct descending order; ties share a rank. |
| ☐ MP-5 | Switch **"Show standings as"** to **Matchpoints**. | The same ranking, now showing raw **matchpoints** (e.g. "18 / 24") instead of a percentage. |
| ☐ MP-6 | On a **player device** that played, confirm its own pair is **highlighted** in the correct direction's list. | Pair highlighted in NS or EW as appropriate. |
| ☐ MP-7 | Open a **traveller** (Manage Game Menu → Travellers → a board). | Each line shows the pairs, the contract, the score, and that board's **matchpoints / top** per pair. |
| ☐ MP-8 | Pick a board where two pairs got the **same** score. | They share the **same** matchpoints on that board (a tie splits the matchpoints). |

---

## MP-B. One-winner Howell — single pooled field

**Fixture:** `--scoring MP_HOWELL` (Howell from the movement library).

| Check | Step | Expected |
|---|---|---|
| ☐ MP-9 | Open the **Leaderboard** and choose **Percentage**. | A **single** ranking — no NS/EW split. |
| ☐ MP-10 | Confirm every pair appears **once** in that one field, ordered best-first. | One pooled list; each pair once. |
| ☐ MP-11 | Confirm there is exactly **one** 1st place (one winner). | Single winner (unless a genuine tie for 1st). |

---

## MP-C. Live recompute

**Fixture:** `--scoring MP --play partial` (room to add a result), **or** a live
game from file 01.

| Check | Step | Expected |
|---|---|---|
| ☐ MP-12 | With the Leaderboard open on one device, enter/confirm (or director-override) another board result elsewhere. | The leaderboard **recomputes and updates live** within a couple of seconds — no refresh. |
| ☐ MP-13 | Confirm the changed pair's percentage and rank move in the direction you'd expect (a good result raises them). | Ranking shifts correctly. |

> **Short-board / half-table equalisation (Neuberg)** and the **AVE+/AVE−
> better-than-average uplift** are matchpoint subtleties with their own cases in
> [file 07](07-special-scoring.md) (`NEUBERG-*`, `AVEUP-*`).
