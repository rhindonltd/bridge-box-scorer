# 07 — Special scoring behaviours

These are the EBU White Book subtleties that are easy to get wrong and hard to
see unless you look for them. Each has a clear **observable effect** on a
traveller or leaderboard. They are the highest-value correctness checks in the
plan.

A recurring theme: the **per-board traveller** often shows a flat figure (60/40,
±3) while the **leaderboard total** reflects an adjustment — the two are
*meant* to differ. Several checks below ask you to compare the two.

Most of these are set up fastest by creating the specific situation **live**
(odd fields, withdrawals), but a seeded fixture gives you director access and a
populated field to apply rulings against.

---

## NEUBERG — short-board / half-table equalisation (Matchpoints)

When a board is played a **different number of times** than others (a half-table,
a sit-out board, or a fouled/cancelled copy leaving fewer good copies), its
matchpoints are **scaled up** to the full-field top so pairs aren't advantaged or
disadvantaged by how many times their board was in play (§4.2.3).

**Setup:** `--scoring MP --play all` with an **even** field forced to a half
table — easiest live: seat an **odd** number of pairs so one table is short, or
**Cancel** one copy of a board (file 06, `RULE-D`) so that board has fewer good
copies than its siblings.

| Check | Step | Expected |
|---|---|---|
| ☐ NEUBERG-1 | Find a board played **fewer** times than the others (short board). Open its traveller. | The pairs on that board are matchpointed among **themselves**… |
| ☐ NEUBERG-2 | …but their matchpoints are **scaled up** toward the full-field top (not left on the smaller board's natural top). | Short-board scores are Neuberg-scaled, comparable to full boards. |
| ☐ NEUBERG-3 | Confirm a pair's **leaderboard total** equals the **sum of the shown per-board matchpoints** (rounding is the last step, so published total == sum of board scores). | Totals reconcile. |
| ☐ NEUBERG-4 | **Small sub-field:** with only **2 or 3** copies of a board, confirm the fixed-percentage rule (§4.2.3.3) is used rather than a naive top (e.g. 2 copies → 55/65%). | Fixed percentages for tiny sub-fields. |

---

## AVEUP — AVE+/AVE− "better than average" uplift (§4.1.1.1)

A strong pair given an **AVE+** keeps the **greater** of the flat 60% and its own
average on the boards it actually played (and AVE− the lesser of 40% / its
average). On the IMP scale it's the greater of **+3** and its average IMP.

**Setup:** `--scoring MP --play all`, then give a **strong pair** an **AVE+**
adjusted score on one board (file 06, `RULE-B`). The pair must be scoring **above
60%** elsewhere for the uplift to bite.

| Check | Step | Expected |
|---|---|---|
| ☐ AVEUP-1 | On the board you adjusted, open the **traveller**. | The per-board display shows the **flat** `A60/40` for that pair. |
| ☐ AVEUP-2 | Open the **Leaderboard** for that pair. | Its **standing** reflects an AVE+ worth the **greater of 60% and its own average** — so a pair averaging 70% gets ~70% for that board in the ranking, **not** a flat 60%. |
| ☐ AVEUP-3 | Confirm a **weak** pair (averaging below 60%) given AVE+ gets the flat **60%** (the greater-of rule floors at 60). | Weak pair uplifted to 60%, not dragged to its lower average. |
| ☐ AVEUP-IMP-1 | Repeat on an **XIMP** game (`--scoring XIMP`): an AVE+ board gives the greater of **+3** and the pair's average IMP in the standings, while the traveller shows flat **+3**. | IMP-scale uplift in standings only. |

---

## SITOUT — sit-out / bye credit

A pair/team sitting out (a bye) is **credited**, not blanked, so a forced bye
doesn't drag its standing down.

**Setup:** an **odd** Swiss field. Seed `--scoring SWISS_PAIRS_MP --tables 4
--rounds 5 --play round1` then draw with a pair benched, **or** create live with
an odd field. For teams: `--scoring SWISS_TEAMS` odd field.

| Check | Step | Expected |
|---|---|---|
| ☐ SITOUT-1 | Draw a round with a **bye** pair (Swiss Pairs, MP). Open the leaderboard. | The bye pair is credited **~60%** (AVE+) for the missed boards — a visible credit, not a gap. |
| ☐ SITOUT-2 | Repeat on an **XIMP** Swiss Pairs game. | The bye pair is credited the **field average (0 net IMP)** for the missed boards (no fixed per-board top on IMP), so the board still counts and doesn't drag it down. |
| ☐ SITOUT-TEAMS-1 | On **Swiss Teams** with a bye, open the leaderboard. | The bye **team** is credited **~12 VP** for the sit-out round (an average-plus VP). |
| ☐ SITOUT-TEAMS-2 | On a **BAM/PAB** teams game with a bye, confirm the bye counts as a **~60% boards-won** credit, not zero. | Board-comparison bye credit. |

---

## WITHDRAW — withdrawals (§2.4.3–§2.4.9)

When a pair/team withdraws partway through, the White Book prescribes how the
withdrawer and its opponents are scored on the unplayed boards. (This requires a
withdrawal to be marked; create the situation live and use the director tools.)

| Check | Step | Expected |
|---|---|---|
| ☐ WITHDRAW-1 | Mark a pair **PENALISED** (withdrawn with a fine). On its unplayed boards, open the leaderboard. | The withdrawer gets **AVE− minus the fine** (`(40 − fine)%`), capped at **half** the event's boards. |
| ☐ WITHDRAW-2 | Check its **opponents** on boards played **after** the halfway point. | They get **AVE+** (indemnified; the result against the withdrawer stands). |
| ☐ WITHDRAW-3 | Check opponents on boards **before** halfway. | The score is **cancelled** (they simply have one fewer board — handled by short-board equalisation, `NEUBERG-*`), **not** an AVE+. |
| ☐ WITHDRAW-4 | Mark a pair **REMOVE** (removed from the ranking). Open the leaderboard. | The removed pair **disappears from the ranking** entirely… |
| ☐ WITHDRAW-5 | …but its **already-played results still count** for its opponents (they keep their real scores against it). | Opponents unaffected; only the ranking drops the removed pair. |
| ☐ WITHDRAW-TEAMS-1 | On a **teams VP** game, mark a team withdrawn. | Its unplayed matches score as a §3.3.9 void (withdrawer AVE−, opponent AVE+). |

---

## LATE — late arrival / handover (§2.4.7)

A pair that arrives late (a stand-in plays its early boards, then the real pair
takes over), or an empty seat still **expected** to fill.

| Check | Step | Expected |
|---|---|---|
| ☐ LATE-1 | Set up a **handover** (a stand-in covers a seat's early boards, the real pair arrives). Open the leaderboard. | The **stand-in** does **not** appear in the ranking (it plays "without standing")… |
| ☐ LATE-2 | …its results **still count** for its opponents… | Opponents keep real results against the stand-in. |
| ☐ LATE-3 | …and the **real** pair gets **AVE−** on its pre-arrival (unplayed) boards. | Latecomer credited AVE− for boards it didn't play. |
| ☐ LATE-4 | Mark a seat **expected late** (empty, pair still expected). Check its opponents. | Opponents are indemnified **AVE+** on the boards they can't play while the pair is still expected. |
| ☐ LATE-5 | Confirm the empty expected-late seat does **not** appear as a 0% ranked line. | No phantom pair on the leaderboard. |

---

## HALFMATCH — Swiss Pairs 2-half-matches odd round

(Cross-reference `SWISS-18` in [file 05](05-scoring-swiss.md) for the draw; this
is the scoring side.)

| Check | Step | Expected |
|---|---|---|
| ☐ HALFMATCH-1 | In a round drawn as **2 half matches**, open a non-anchor's leaderboard contribution. | The non-anchor is **compensated** for the half it missed (MP 60/50/40%; XIMP +2/0/−2 IMP). |
| ☐ HALFMATCH-2 | Confirm the **anchor** plays the full round (both halves, two opponents) and is scored on both. | Anchor scored over the whole round. |
| ☐ HALFMATCH-3 | Confirm the round's VP sums the two 10-VP half-scales back to a /20 round. | Per-round VP out of 20. |

---

## MISMATCH — §3.5 detection

Covered as a director ruling in [file 06](06-director-rulings.md)
(`RULE-MM-*` / `RULE-24..27`): the **detection threshold** (opponents differ by
> 5 current VP) and the **one-sided** VP adjustment are the scoring-specific
points to verify there.
