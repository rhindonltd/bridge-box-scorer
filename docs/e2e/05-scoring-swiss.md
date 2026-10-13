# 05 — Scoring: Swiss (Pairs & Teams) + the Draw Next Round flow

Swiss movements are **drawn round by round**: only round 1 is materialised at
start, and each later round is drawn by the director from the current standings
on the **Movement** screen. Drawing shows a **review** page of the proposed
seating/matches (with names) that the director can inspect — and, for Swiss
Pairs, edit — before committing. **OK** commits; **Cancel** discards.

Swiss is ranked on **Victory Points**:

| Movement | Scoring | Per-round VP from |
|---|---|---|
| **Swiss Pairs** (MP mode) | Matchpoints | each round's field **matchpoint %** → VP |
| **Swiss Pairs** (XIMP mode) | Cross-IMPs | each pair's per-round **cross-IMP** vs field → VP |
| **Swiss Teams** | IMP (VP) | each match's **IMP margin** → VP |

**Fastest setup (round 1 played, ready to draw round 2):**

```bash
npm run seed:e2e -- --scoring SWISS_PAIRS_MP   --tables 4 --rounds 5 --play round1
npm run seed:e2e -- --scoring SWISS_PAIRS_XIMP --tables 4 --rounds 5 --play round1
npm run seed:e2e -- --scoring SWISS_TEAMS      --tables 4 --rounds 5 --play round1
```

Plant the director token (see [README](README.md)) and open **Manage Game Menu →
Movement**. For the draw-edit checks you also want a player device to confirm the
commit propagates live.

---

## SWISS-A. Swiss Pairs — VP leaderboard (MP mode)

**Fixture:** `--scoring SWISS_PAIRS_MP --play round1`.

| Check | Step | Expected |
|---|---|---|
| ☐ SWISS-1 | Open the **Leaderboard**. | Pairs ranked on **Victory Points** (one pooled field — Swiss is one-winner), not a raw percentage. |
| ☐ SWISS-2 | Confirm round 1's field matchpoint result has been converted to a **per-round VP** (roughly 0–20 per round) and summed. | VP totals present and ordered best-first. |
| ☐ SWISS-3 | Repeat with `--scoring SWISS_PAIRS_XIMP`: confirm the leaderboard is again **VP**, derived from per-round **cross-IMP** instead of matchpoints. | VP leaderboard; `SWISS-XIMP-1`. |

---

## SWISS-B. The Draw Next Round control (Swiss Pairs)

**Fixture:** `--scoring SWISS_PAIRS_MP --tables 4 --rounds 5 --play round1`, **or**
a live Swiss game. Needs a player device to prove the commit propagates.

| Check | Step | Expected |
|---|---|---|
| ☐ SWISS-4 | **Movement** screen. Note the per-round **Played** column (played / total, colour-coded: green = all in, yellow = partial). | Progress visible so outstanding rounds are obvious. |
| ☐ SWISS-5 | Before all of round 1 is in (use `--play none` or a live game mid-round), confirm **Draw Next Round** is **disabled** with "Waiting for all results in the current round." | Button disabled with the reason. |
| ☐ SWISS-6 | With all round-1 results in (the `round1` fixture), confirm **Draw Next Round** is **enabled**. | Button enabled. |
| ☐ SWISS-7 | Tap **Draw Next Round**. | A **review** page: each table with the two pairs' **names** for the proposed round 2, plus the **sit-out** pair if the field is odd. Nothing committed yet. |
| ☐ SWISS-8 | On a **player device**, confirm it has **not** moved to round 2. | Players still on round 1 / waiting — the draw isn't committed. |
| ☐ SWISS-9 | On the review page, tap one pair then another. | They **swap** seats; the display updates. |
| ☐ SWISS-10 | If there's a sit-out: tap a seated pair, then the **sit-out** slot. | That pair takes the **bye**; the benched pair takes the vacated seat. |
| ☐ SWISS-11 | Make an edit that **repeats** an earlier-round pairing. | A **warning** appears (e.g. "a pairing repeats an earlier-round opponent") but does **not** block you. |
| ☐ SWISS-12 | Tap **Cancel**. | Review closes with **nothing saved**; back on Movement; can draw again. |
| ☐ SWISS-13 | Tap **Draw Next Round** again, then **OK**. | Committed: a "Round 2 drawn." confirmation; the new seating appears on **every** device. |
| ☐ SWISS-14 | Verify the committed seating matches exactly what the review showed (including any swaps/bye change you kept). | Live round == reviewed seating. |
| ☐ SWISS-15 | Play round 2, then draw round 3 the same way. | Each round previews then commits on OK. |
| ☐ SWISS-16 | After the final configured round, confirm **Draw Next Round** reports the event is complete (no further draw). | "All rounds have already been drawn." |

---

## SWISS-C. Swiss Pairs odd field — bye vs half-matches

**Setup:** create a Swiss Pairs game **live** with an **odd** number of pairs
(leave one seat empty). On the Swiss setup, the odd-field handling is **Bye**
(default) or **2 half matches**.

| Check | Step | Expected |
|---|---|---|
| ☐ SWISS-17 | With **Bye** handling, draw a round. | One pair is shown as the **sit-out / bye**; it is credited (not blanked) — see the bye-credit case in [file 07](07-special-scoring.md) (`SITOUT-*`). |
| ☐ SWISS-18 | With **2 half matches** handling and a round planned for it, draw that round. | Three pairs form a group: an **anchor** plays the full round in two halves vs two opponents; the other two each play one half and are **compensated** for the half they miss. |
| ☐ SWISS-19 | Confirm a one-table odd field (a single pair) **rejects** 2-half-matches at start. | Blocked with "needs at least three pairs (two tables)". |

---

## SWISS-D. Swiss Teams — draw flow

**Fixture:** `--scoring SWISS_TEAMS --tables 4 --rounds 5 --play round1`.

| Check | Step | Expected |
|---|---|---|
| ☐ SWISS-20 | Open the **Leaderboard**. | Teams ranked on **Victory Points**, shown as a per-round **barometer** (each round's VP contribution visible). |
| ☐ SWISS-21 | With round 1 complete, **Draw Next Round** on the Movement screen. | A **review** of the proposed **matches** (team names) plus any **bye** or **triple**. |
| ☐ SWISS-22 | Confirm the teams review is **read-only** (accept or redraw; no hand-editing of matches — unlike Swiss Pairs). | No swap controls; **OK** / **Cancel** only. |
| ☐ SWISS-23 | Tap **Cancel**, then draw again and **OK**. | Committed; new matches appear on every device; players' away pairs learn where to move. |
| ☐ SWISS-24 | **Odd team count:** with **Bye** handling, confirm one team gets a **bye** (credited ~12 VP — see `SITOUT-TEAMS-1` in file 07). | Bye team shown and credited. |
| ☐ SWISS-25 | **Triples:** with **Triple** handling and a round planned for it, confirm a **three-way** (short or long triple) is drawn instead of a bye. | Three teams play a three-way; a long triple spans two consecutive rounds. |
| ☐ SWISS-26 | Confirm an odd team count with no triple option errors clearly ("needs at least three teams — add a table, or switch to the bye option"). | Clear rejection. |

> Swiss also has **§3.5 mismatch detection** (a retroactive score change can make
> an earlier draw's opponents wrong). That is a director ruling — see
> [file 06](06-director-rulings.md) (`RULE-MM-*`).
