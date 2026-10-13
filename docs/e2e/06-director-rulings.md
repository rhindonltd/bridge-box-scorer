# 06 — Director rulings & corrections

Every ruling is reached the same way: **Manage Game Menu → Travellers → pick a
board → tap a result row → the director contract wizard opens** (marked
"Director"), whose first screen (**Adjust Result**) is the hub that routes to
each ruling. All rulings recompute the leaderboard/traveller **live** on every
device.

These checks need **director access**. The quickest setup is a seeded fixture +
planted token (see [README](README.md) → Fixture setup); the fixture tells you
which `--scoring` to use so the relevant ruling is offered.

| Ruling | Offered for | Fixture |
|---|---|---|
| Override / played contract | every game | `--scoring MP --play all` |
| Adjusted score | every game | `--scoring MP --play all` |
| Weighted score | every game | `--scoring MP --play all` |
| Cancel / foul board (§3.3.2) | every game | `--scoring MP --play all` |
| Void match — pairs (§3.3.8) | Swiss **Pairs** | `--scoring SWISS_PAIRS_MP --play round1` |
| Void match — teams (§3.3.6/§3.3.9) | **Teams** | `--scoring TEAMS_IMP_VP --play round1` |
| Board not played — teams (§3.3.7) | **Teams** | `--scoring TEAMS_IMP_VP --play round1` |
| Mismatch (§3.5) | any **Swiss** | `--scoring SWISS_PAIRS_MP --play round1` (needs ≥2 drawn rounds) |

---

## RULE-A. Override a result

**Fixture:** `--scoring MP --play all`.

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-1 | Travellers → a board with results → tap a result row. | The director wizard opens at the **Adjust Result** hub. |
| ☐ RULE-2 | Tap **Enter Contract**, enter a **different** contract/result, reach **Confirm**, tap **Submit**. | Saves; the traveller row updates to the new result; the leaderboard recomputes. |
| ☐ RULE-3 | On a **player device** viewing that board's traveller, confirm the corrected result appears **live**. | Updates without refresh. |
| ☐ RULE-4 | **Pass Out / Not Played override:** repeat, choosing **Pass Out** (or **Not Played**) at the Level step. | Saved as "Pass Out" / "Not Played". |

---

## RULE-B. Adjusted score

**Fixture:** `--scoring MP --play all`.

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-5 | Open the wizard on a board row → **Adjusted Score**. | Presets (e.g. **AVE (50/50)**, **AVE+ / AVE− (60/40)**) and a **Custom** option. |
| ☐ RULE-6 | Pick **AVE+ / AVE− (60/40)** (or Custom NS 60 / EW 40) → **Submit**. | Saved as an adjusted result; the traveller shows an **AVE-type** score (e.g. `A60/40`). |
| ☐ RULE-7 | Open the **Leaderboard**. | The two pairs' standings reflect the adjusted split. (On MP, an **exact** AVE+/AVE− is further uplifted in the standings — see `AVEUP-1` in [file 07](07-special-scoring.md).) |

---

## RULE-C. Weighted score

**Fixture:** `--scoring MP --play all`.

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-8 | Open the wizard → **Weighted Score**. | A screen to enter **weighted components** (contracts + weights). |
| ☐ RULE-9 | Enter two components with weights summing to 100% → **Submit**. | Saved; the traveller shows the weighted result; the leaderboard reflects the director's chosen split. |
| ☐ RULE-10 | Confirm the weighted board is **not** re-matchpointed/re-scaled against the field (the director's figure stands). | Weighted value preserved in standings. |

---

## RULE-D. Cancel / foul board (§3.3.2)

**Fixture:** `--scoring MP --play all`.

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-11 | Open the wizard → **Cancel / Foul Board**. | The adjusted-score picker (a cancel carries an AVE-type split). |
| ☐ RULE-12 | Pick a split (e.g. AVE 50/50) → **Submit**. | The board flips to **CANCELLED** with the artificial `A<ns>/<ew>` score. |
| ☐ RULE-13 | Confirm the **correctly-played** copies of that board still score among themselves (a fouled copy doesn't poison the rest). | Other copies form a Neuberg-scaled sub-field — see [file 07](07-special-scoring.md) (`NEUBERG-*`). |

---

## RULE-E. Void match — Swiss Pairs (§3.3.8)

**Fixture:** `--scoring SWISS_PAIRS_MP --play round1`.

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-14 | Open the wizard on a board row → confirm a **Void Match (Pairs)** branch is offered (only for Swiss Pairs). | Branch present. |
| ☐ RULE-15 | Choose a cause (e.g. an offending side) → **Submit**. | The whole table's match is voided; each pair gets an **AVE+/AVE−/AVE** compensation per the cause; the match is removed from the field the other pairs are matchpointed against. |
| ☐ RULE-16 | Confirm a **non-Swiss pairs** game (`--scoring MP`) does **not** offer this branch. | Branch absent. |

---

## RULE-F. Void match — Teams (§3.3.6 / §3.3.9)

**Fixture:** `--scoring TEAMS_IMP_VP --play round1`.

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-17 | Open the wizard → **Void Match (Teams)**. | Cause options: a **standard** seating void and the **short** (§3.3.9) causes (offender NS/EW/both/neither). |
| ☐ RULE-18 | Choose the **standard** cause → **Submit**. | The match scores as a ruling **VP** (flat 40/60) instead of a margin → VP; the leaderboard updates. |
| ☐ RULE-19 | On another match, choose a **short-offender** cause → **Submit**. | The §3.3.9 half-board AVE+/AVE− split is applied; the offending team gets the lower VP. |
| ☐ RULE-20 | Confirm a **board-comparison** teams game (`--scoring TEAMS_BAM`) phrases the void in **board-win** terms, not VP. | Wording adapts to BAM/PAB. |

---

## RULE-G. Board not played — Teams (§3.3.7)

**Fixture:** `--scoring TEAMS_IMP_VP --play round1`.

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-21 | Open the wizard → **Board Not Played (Teams)**. | A **fault** picker (EW at fault / NS at fault / neither / both). |
| ☐ RULE-22 | Choose **EW at fault** → **Submit**. | The board is removed; the non-offending side (NS) gets a **+3 IMP** indemnity (NS at fault → −3; neither/both → 0 net). |
| ☐ RULE-23 | Confirm the removed board contributes the ±3 IMP swing to the team totals (not a table comparison). | Teams IMP total moves by ±3. |

---

## RULE-H. Mismatch (§3.5)

A §3.5 mismatch is when a **retroactive** score change on an earlier round means
a later round's committed draw no longer matches what the corrected standings
would have produced — a pair/team ended up against the wrong-strength opponents.

**Fixture:** a Swiss game with **≥ 2 drawn rounds**, then a retroactive change.
Easiest: seed `--scoring SWISS_PAIRS_MP --tables 4 --rounds 5 --play round1`,
draw round 2 live (file 05), play some of it, then go back and **override** a
round-1 result enough to reshuffle round-1 standings.

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-24 | After the retroactive change, open the wizard on an affected board row → confirm a **Mismatch (Swiss)** branch is offered. | Branch present (Swiss only). |
| ☐ RULE-25 | Confirm the detection only flags a round where the **correct** opponent differs AND the two candidate opponents' current VPs differ by **more than 5**. | Below-threshold differences are not flagged. |
| ☐ RULE-26 | Enter a mismatch ruling (side / direction / fault) → **Submit**. | Only the **mismatched side's** round VP is adjusted (§3.5.2 one-sided); the boards themselves stay real/in the field. |
| ☐ RULE-27 | Confirm a **teams** Swiss game offers the same branch with sides labelled as **teams**. | Teams wording. |

---

## RULE-I. Enter deals (director)

**Fixture:** any, with **Allow Hand Entry** on (create live, or any seeded game).

| Check | Step | Expected |
|---|---|---|
| ☐ RULE-28 | Manage Game Menu → **Enter Deals** → **Select Board** → a board. | Deal entry with direction tabs (North/East/South/West), each "{count}/13". |
| ☐ RULE-29 | Lay out all four hands (52 cards). | **Save deal** becomes available. |
| ☐ RULE-30 | Tap **Save deal**. | Saved; a **Show hand** button now appears on that board's traveller for everyone. |
