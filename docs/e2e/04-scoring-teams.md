# 04 — Scoring: Teams

A **team** is the two pairs seated at one home table. Each match is played in two
rooms (open/closed): a team's NS pair stays home while its other pair plays the
opponent's boards at the opponent's table, so a match spans two tables playing
the **same** boards. Teams can be scored four ways, chosen on the create form:

| Method | Internal | Ranked on | Leaderboard shows |
|---|---|---|---|
| **IMP (Victory Points)** | `IMP_VP` | per-round IMP margin → **Victory Points** (WBF 20-VP scale), summed | VP total |
| **IMP (aggregate)** | `IMP` | **total net IMPs** across all boards, no VP conversion | net IMPs (can be negative) |
| **Board-a-Match** | `BAM` | **boards won** (win 1 / tie ½ / loss 0) | boards won, 1 pt/board scale |
| **Point-a-Board** | `PAB` | **boards won** — same ranking as BAM | boards won, 2 pt/board scale |

This file uses a **Teams Round Robin** (whole schedule known up front, so every
board exists at start). Swiss Teams (drawn round by round) is in
[file 05](05-scoring-swiss.md).

**Fastest setup (one per method):**

```bash
npm run seed:e2e -- --scoring TEAMS_IMP_VP  --tables 4 --rounds 3 --play all
npm run seed:e2e -- --scoring TEAMS_IMP_AGG --tables 4 --rounds 3 --play all
npm run seed:e2e -- --scoring TEAMS_BAM     --tables 4 --rounds 3 --play all
npm run seed:e2e -- --scoring TEAMS_PAB     --tables 4 --rounds 3 --play all
```

Plant the director token and open each event.

---

## TEAM-A. IMP (Victory Points)

**Fixture:** `--scoring TEAMS_IMP_VP`.

| Check | Step | Expected |
|---|---|---|
| ☐ TEAM-1 | Open the **Leaderboard**. | Teams listed with a **Victory Points** total (e.g. "VP 42.3"), **not** a percentage. |
| ☐ TEAM-2 | Confirm each team appears **once** (a team, not its two pairs). | One row per team; team names (e.g. "Team A1NS" from a seeded fixture, or the entered name). |
| ☐ TEAM-3 | Confirm ranking is **highest VP first**. | Correct order. |
| ☐ TEAM-4 | Open a match / round view and confirm a round's margin maps to VP on a **discrete 20-point scale** (a big win approaches 20–0, a tie 10–10). | VP within 0–20 per round, summing to the total. |
| ☐ TEAM-5 | Confirm a round with no result yet (or a bye) contributes a neutral **~10 VP**, not 0. | Undrawn/empty round scores neutrally. |

---

## TEAM-B. IMP (aggregate net IMPs)

**Fixture:** `--scoring TEAMS_IMP_AGG`.

| Check | Step | Expected |
|---|---|---|
| ☐ TEAM-6 | Open the **Leaderboard**. | Teams ranked on **total net IMPs** (e.g. "+37", "−12") — **no** VP conversion. |
| ☐ TEAM-7 | Confirm at least one team shows a **negative** total and it ranks below the positive teams. | Negatives shown and ordered correctly. |
| ☐ TEAM-8 | Compare two teams: the one with the larger net IMP margin ranks higher. | Pure aggregate ranking (no VP compression). |

---

## TEAM-C. Board-a-Match

**Fixture:** `--scoring TEAMS_BAM`.

| Check | Step | Expected |
|---|---|---|
| ☐ TEAM-9 | Open the **Leaderboard**. | Teams ranked on **boards won**, scored at the BAM scale (**1 pt** per board won, **½** a tie). |
| ☐ TEAM-10 | Open a match and confirm each board is a **win / tie / loss** comparison between the two rooms (not an IMP margin). | Board-by-board win/tie/loss. |
| ☐ TEAM-11 | Confirm a team's total equals its boards won across the event. | Total = sum of per-board wins/ties. |

---

## TEAM-D. Point-a-Board

**Fixture:** `--scoring TEAMS_PAB`.

| Check | Step | Expected |
|---|---|---|
| ☐ TEAM-12 | Open the **Leaderboard**. | Teams ranked on boards won at the PAB scale (**2 pts** a win, **1** a tie). |
| ☐ TEAM-13 | Confirm the **ranking order** matches what BAM would give for the same results (PAB and BAM differ only in the presentation scale, not who wins). | Same order as BAM; doubled point values. |

---

## TEAM-E. Teams structure sanity

**Fixture:** any teams fixture.

| Check | Step | Expected |
|---|---|---|
| ☐ TEAM-14 | Open a **traveller** for a board. | Both rooms' results for that board appear (the two tables that played it). |
| ☐ TEAM-15 | Confirm a team's **home NS** pair and its **away** pair are both attributed to the one team. | A team's two pairs roll up to one team row on the leaderboard. |
| ☐ TEAM-16 | Live recompute: override a board result; confirm the leaderboard updates live and the affected team's standing moves. | Updates without refresh. |

> Teams scoring also drives the **board-removal (§3.3.7)** and **match-void
> (§3.3.6/§3.3.9)** director rulings — see [file 06](06-director-rulings.md)
> (`RULE-REMOVE-*`, `RULE-VOIDT-*`).
