# 03 — Scoring: Pairs · Cross-IMPs (XIMP)

Cross-IMP (Butler) scoring compares each pair's result on a board against the
**average** of the field (in IMPs), rather than ranking by matchpoints. A pair's
standing is its **average cross-IMPs per board**. Unlike matchpoints there is a
single pooled ranking (no NS/EW percentage split), and scores can be **negative**
(below the field average).

**What you're verifying:** the leaderboard ranks on **cross-IMPs** (not a
percentage), negatives are shown correctly, and the per-board traveller shows an
IMP figure per pair.

**Fastest setup:**

```bash
npm run seed:e2e -- --scoring XIMP --play all
```

Plant the director token (see [README](README.md)) and open the event, or play
live via [file 01](01-core-flows.md) choosing **Cross-IMPs** at create time.

---

## XIMP-A. The cross-IMP leaderboard

**Fixture:** `--scoring XIMP --play all`.

| Check | Step | Expected |
|---|---|---|
| ☐ XIMP-1 | Open the **Leaderboard**. | **No "Show standings as" percentage/matchpoint prompt** — XIMP has one presentation. |
| ☐ XIMP-2 | Confirm each pair's score is a **cross-IMP figure** (e.g. "+3.2", "−1.8"), not a percentage. | Cross-IMP values shown. |
| ☐ XIMP-3 | Confirm at least one pair shows a **negative** total (below field average). | Negatives render with a minus sign and rank below 0. |
| ☐ XIMP-4 | Confirm the ranking is ordered **highest cross-IMP first**. | Correct descending order. |
| ☐ XIMP-5 | Confirm the field is a **single pooled ranking** (no separate NS/EW winners). | One list; each pair once. |
| ☐ XIMP-6 | Open a **traveller** for a board. | Each line shows the result/score and that pair's **IMPs vs the field average** on the board. |
| ☐ XIMP-7 | On a board, confirm a result **better than the field** shows **positive** IMPs and a worse one **negative**, roughly symmetric around 0. | Signs correct; field roughly averages to zero. |

---

## XIMP-B. Board-count scaling & live recompute

**Fixture:** `--scoring XIMP --play partial`.

| Check | Step | Expected |
|---|---|---|
| ☐ XIMP-8 | Note a pair's **average** cross-IMP. Add/override one more board result for that pair. | Its **average** recomputes over the new board count (not just a raw sum) and the leaderboard updates live. |
| ☐ XIMP-9 | Confirm a pair that has played **fewer** boards (e.g. a half-table) is still ranked on a comparable **per-board** basis, not penalised for board count. | Ranking is per-board-fair. |

> XIMP also carries the **AVE+/AVE− better-than-average uplift** on the IMP scale
> (±3 vs the pair's own average) — see [file 07](07-special-scoring.md)
> (`AVEUP-IMP-1`).
