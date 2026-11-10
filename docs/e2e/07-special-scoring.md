# 07 — Special scoring behaviours

These are the EBU White Book subtleties that are easy to get wrong and hard to
see unless you look for them. Each has a clear **observable effect** on a
traveller or leaderboard. They are the highest-value correctness checks in the
plan.

A recurring theme: the **per-board traveller** often shows a flat figure (60/40,
±3) while the **leaderboard total** reflects an adjustment — the two are
*meant* to differ. Several checks below ask you to compare the two.

Most of these are set up fastest with a seeded fixture (see the
[README](README.md)); withdrawals, late arrivals and substitutions have their
own recipes in files [11](11-withdrawals-late-arrivals.md) and
[12](12-handover-substitution.md).

---

## NEUBERG — short-board / half-table equalisation (Matchpoints)

When a board is played a **different number of times** than others (a half-table,
a sit-out board, or a fouled/cancelled copy leaving fewer good copies), its
matchpoints are **scaled up** to the full-field top so pairs aren't advantaged or
disadvantaged by how many times their board was in play (§4.2.3).

**Setup:** `--scoring MP --tables 3 --rounds 3 --play partial --withdraw A1NS@3 --treatment A1NS=REMOVED` makes boards 5 and 6 two-result boards on a three-result field (the automated check is `scoring-neuberg.journey.ts`). Or `--scoring MP --play all` with an **even** field forced to a half
table — easiest live: seat an **odd** number of pairs so one table is short, or
**Cancel** one copy of a board (file 06, `RULE-D`) so that board has fewer good
copies than its siblings.

| Check | Step | Expected |
|---|---|---|
| ☐ NEUBERG-1 | Find a board played **fewer** times than the others (short board). Open its traveller. | The pairs on that board are matchpointed among **themselves**… |
| ☐ NEUBERG-2 | …the **traveller itself shows only that board's own field** (e.g. 2 and 0 out of a top of 2 on a two-result board, or 100% / 0%). The **scaling to the full-field top is applied when the standings are built**: the same board counts as 4 and 1 out of a top of 4 (3 results on a full board). | Traveller = own field; standings use the Neuberg-scaled values, so short and full boards carry equal weight. |
| ☐ NEUBERG-3 | Confirm a pair's **leaderboard percentage** equals its **Neuberg-scaled** matchpoints over the **full-field top** for every board it played (e.g. with 3 results on a full board each board is out of 4: 14 of 24 = 58.33%). The traveller's own-field figures are *not* what the standings add up. | Standings reconcile with the scaled matchpoints. |
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

## ABSENT — withdrawals, late arrivals & empty late seats (Pairs events)

The step-by-step flows (who presses what) are in
[file 11](11-withdrawals-late-arrivals.md); the fixtures there put a game into
each state in one command. These are the **scoring** points to confirm, on a
**Matchpoints** and a **Cross-IMPs** game.

| Check | Fixture | Step | Expected |
|---|---|---|---|
| ☐ ABSENT-1 | F11-D (withdrawn, AVE) | **Travellers → Board 7**. | The withdrawn line shows **A40/60**: the absent pair 40%, its opponents 60%. On XIMP: **−3 / +3**. |
| ☐ ABSENT-2 | F11-D | Every line on Board 7. | Each pair's matchpoints lie between **0 and the board top**. An AVE line on the board must not push a real result above the top or below zero. |
| ☐ ABSENT-3 | F11-D | **Leaderboard**. | The absent pair stays **ranked**. It and its opponent are scored over the AVE boards as well as their real ones. |
| ☐ ABSENT-4 | F11-D | Compare the opponent's standing with a flat 60% on those boards. | **§4.1.1.1 uplift:** a pair averaging above 60% keeps its own higher average on its AVE+ boards (AVE− is lowered to the pair's average if that is below 40%). The traveller still shows the flat **A40/60**. |
| ☐ ABSENT-5 | F11-D, then **Pairs → Missed boards → Remove** | Traveller + Leaderboard. | The absent line is **gone** from the traveller, and both pairs are scored only on boards that were really played, as if the opponent sat out. |
| ☐ ABSENT-6 | F11-B (empty late seat) | **Travellers → Board 7**; **Leaderboard**. | The line against the empty seat shows **A60/40** (AVE+ to the pair that was there). The **empty seat is never ranked**. With **Remove**, the line disappears from the traveller too. |
| ☐ ABSENT-7 | F11-C (late arrival) | **Travellers → Board 7**; **Leaderboard**. | The latecomer's missed round-1 boards show **A60/40** (latecomer AVE−). It is still **ranked**, on real boards plus AVE− boards. |
| ☐ ABSENT-8 | Any of the above | Change the treatment with the leaderboard open on a DISPLAY. | The display re-ranks live. |

> **Gone:** the old automatic rules — before/after-half cancel vs indemnity, the
> "fewer than half the boards loses standing" test for latecomers, REMOVE vs
> PENALISED and the 0–40% fine — **no longer apply to Pairs events**. The
> director's per-pair **AVE− / AVE+** or **Remove** choice decides. Teams and
> Swiss events keep their own handling (`ABSENT-TEAMS-1`).

| Check | Step | Expected |
|---|---|---|
| ☐ ABSENT-TEAMS-1 | **Teams VP** game: **Manage Tables** → a table → **Change standing → Withdrawn** (choose a round, Remove/Penalised). | The team's unplayed matches score as a §3.3.9 void (withdrawer AVE−, opponent AVE+). |

---

## SUBST — substitutions (§2.4.7)

Flows are in [file 12](12-handover-substitution.md). The scoring points:

| Check | Fixture | Step | Expected |
|---|---|---|---|
| ☐ SUBST-1 | F12-B | **Leaderboard**, seat left on **One line**. | One ranked line over **all** the seat's boards, named after the **Main** pair with "(Sub) …" beneath. There is **no** artificial score for the change of pair. |
| ☐ SUBST-2 | F12-B | **Two lines**, after the arriving pair has played. | Two lines, each pair ranked only on **its own** boards. |
| ☐ SUBST-3 | F12-B | A pair marked **Eligible = No**. | It drops out of the ranking, but its results **still count** for its opponents. |

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
(`RULE-24`–`RULE-27f`): the **detection threshold** (opponents differ by
> 5 current VP) and the **one-sided** VP adjustment are the scoring-specific
points to verify there.
