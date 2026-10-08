# EBU White Book — Scoring Rules Reference

A condensed, structured reference of the scoring and score-adjustment rules
that this app implements, drawn from the **EBU White Book — Technical matters,
2025 edition (effective 1 August 2025)**. It covers only the parts of the White
Book that are relevant to how Bridge Box Scorer scores games and adjusts
results.

## Purpose and scope

- **This is a reference, not a specification of the app.** It captures what the
  White Book says. A separate exercise will audit the app against it to find
  inconsistencies. Nothing here describes current app behaviour.
- **Relevant topics only.** Included: adjusted scores (artificial, assigned,
  split, weighted), Victory Point scoring, cross-IMP → VP conversion, unplayable
  / cancelled boards, Swiss mismatches and the Swiss draw, late arrivals and
  withdrawals (and their scoring consequences), methods of scoring (matchpoints,
  IMPs, cross-IMPs), and calculation/rounding rules. Deliberately **excluded** as
  not relevant to this app: appeals and appeals procedure,
  disclosure/alerting/announcements, psychic-bidding regulation, screen
  regulations, accommodating disabled players, disciplinary matters, the
  per-Law commentary (Laws 1–93), and the roles of the TD/scorer/DIC.

> **Source caveats**
> - Section numbers below (e.g. §4.1.1.1) are the White Book's own numbering,
>   2025 edition. Later editions may renumber.
> - This reference was transcribed from the published PDF. **Large numeric
>   tables — in particular the WBF discrete Victory Point scales (§3.1.1) — are
>   NOT reproduced here**, because they do not transcribe reliably from the PDF
>   and an error in a VP table would be worse than an omission. For those,
>   consult the official White Book PDF or the EBU's online VP calculator. Where
>   a table *is* reproduced (e.g. the Swiss Pairs percentage scale), treat it as
>   indicative and confirm against the official source before relying on it.
> - Rules are paraphrased and summarised, not quoted verbatim. Always defer to
>   the official White Book for the authoritative wording.

---

## 1. Adjusted scores (White Book §4.1)

The TD can replace or adjust the score obtained at the table. There are four
kinds: artificial adjusted, assigned adjusted, split, and weighted. They can
combine (e.g. split **and** weighted).

### 1.1 Artificial adjusted scores — AVE+ / AVE / AVE− (§4.1.1.1, Law 12C2)

Given when a board **cannot be completed** (e.g. a player heard a result from
another table, or looked at the wrong hand, and the board cannot be played).
Each side receives one of:

- **AVE+ (average plus)** — the side is **not at fault**.
- **AVE (average)** — the side is **partly at fault**.
- **AVE− (average minus)** — the side is **fully at fault**.

**Default values:**

| Adjustment | Matchpoints | IMPs / teams |
| ---------- | ----------- | ------------ |
| AVE+       | 60%         | +3 IMPs      |
| AVE        | 50%         | 0 IMPs       |
| AVE−       | 40%         | −3 IMPs      |

- At head-to-head teams, AVE+/AVE− translate to +3 / −3 IMPs (a team 23 IMPs
  ahead without the board is 26 ahead with the AVE+).

**"Better than average" override (matchpoints and IMPs).** If a pair's **actual
average** on the *other* boards is already better than the flat value, they keep
their actual average instead:

- If a pair's average is **greater than 60%**, AVE+ gives them **their actual
  average** (not a flat 60%).
- If a pair's average is **less than 40%**, AVE− gives them **their actual
  average** (not a flat 40%).
- The same applies at IMPs: a pair averaging +4 IMPs gets +4 for AVE+; a pair
  averaging −4 gets −4 for AVE−.

**The averaging window — what counts as "the other boards" (§8.80.6).** The
"session" over which the average is computed depends on the event:

- **Swiss events:** a session is **the match**. So within a Swiss match, AVE+ is
  the greater of 60% and the pair's average percentage on the *other boards in
  that match* (§8.80.6.1).
- **All-play-all stage:** the average is over the **whole stage**, which may be
  more than one session (§8.80.6.2).
- **Otherwise:** the average is over a session, which ends at a major movement of
  sections or a major break with a corresponding score calculation (§8.80.6.3).

**Balance principle.** The TD should not give an artificial adjusted score that
**adds up to more than 100%** unless an outside agency was at fault.

**Notation** (used on score records): `A6060`, `A6040`, `A5050`, `A4040`,
`A6050` — the two pairs' percentages concatenated (e.g. `A6040` = AVE+ / AVE−).

Worked examples from the White Book:

- A board is unplayable because the previous table fouled it → **AVE+/AVE+
  (A6060)**, since an outside agency was at fault.
- A board cannot be played because there is no time left → the TD might give
  **AVE−/AVE− (A4040)** (both at fault), or **AVE/AVE (A5050)** /
  **AVE+/AVE− (A6040)** with extenuating circumstances. The TD should **not**
  give **AVE+/AVE (A6050)** unless an outside influence delayed the table.

**Special case — completed board, still artificially adjusted.** For an illegal
agreement, or a fielded psyche/deviation, the board **is** completed and then an
artificial adjusted score is given **unless the non-offending side did better
than AVE+**. The score given is **AVE+/AVE− (A6040)**, except a fielded psyche
also adds a procedural penalty — usually the standard penalty (25% of a top at
matchpoints, 1 VP at Victory Points) — recorded as `A6040` plus the separate
penalty.

### 1.2 Assigned adjusted scores (§4.1.1.2, Law 12C1)

When a score **was** obtained but the TD decides it should change because of an
infraction, the TD **assigns a concrete result**. Example: a pair defends 3♦
after misinformation; the TD judges they would have bid and made 3NT vulnerable
(eleven tricks) and **assigns +660 to N/S for both sides**.

- In a pairs event the single assigned score **replaces** the table score and is
  used in scoring.
- A single assigned score should only be used when the TD is confident how the
  auction and play would have gone; otherwise prefer a **weighted** score
  (§4.1.1.4).

### 1.3 Split scores (§4.1.1.3)

The two sides may be given **different** adjusted scores (e.g. a Law 82C TD error
treated as non-offending for both sides; or when one side forfeits full redress
through a wild/gambling action or a serious unrelated error). Consequences:

- The two sides' scores **need not balance**.
- In a VP event, the **final VP scores need not balance** (e.g. a 20-top VP match
  could finish 16–6).

### 1.4 Weighted scores (§4.1.1.4, Law 12C1c)

To reflect the probabilities of several possible outcomes, the TD assigns a
**weighting to each outcome**. Example weighting from the White Book:

```
25% of +1430 (6♠=)
40% of +680  (4♠+2)
20% of +650  (4♠+1)
15% of −100  (6♠−1)
```

**Calculation rule (important):** convert **each component result to matchpoints
(or IMPs) first**, then apply the weighting and sum. Do **not** average the raw
scores and convert once.

Worked matchpoint example (six-table movement, weighted 30% of +650 / 70% of
−100 for a board whose adjusted frequencies give +650 → 9.7 MP and −100 →
5.7 MP for N/S):

```
30% × 9.7 = 2.91
70% × 5.7 = 3.99
N/S total = 6.90   (E/W get the complementary 3.10)
```

**Equity principle:** the offenders must **not gain** from the weighting, so it
should lean in the non-offenders' favour (§8.12.14). Fractions are handled per
the rounding rules (§4.2.6.1).

Recommended software capability: up to **5 different results** per weighted
score, with weightings to **2 decimal places** (e.g. 33% shown as 0.33).

---

## 2. Methods of scoring (White Book §4.2)

### 2.1 How weighted / split scores appear in matchpoint frequencies (§4.2.1)

- A **weighted** score appears in the frequency table with its weighting split
  across its component results (e.g. a 30/70 weighting adds 0.3 to one score's
  frequency and 0.7 to another), so the field's matchpoints shift fractionally
  for everyone. The weighted pair's matchpoints are the weighted sum of each
  component's matchpoints (as in §1.4).
- A **split** score requires **two separate frequency charts** — one for N/S,
  one for E/W — because the two sides are matchpointed against different fields.

### 2.2 Assigned score that did not occur on the board (manual method, §4.2.2)

When an assigned score falls **between** two scores that did occur, and the
session has to be adjusted by hand (no re-score):

- The matchpoints for an intermediate score = **the next-lower score's
  matchpoints + that lower score's frequency** (equivalently, the next-higher
  score's matchpoints − the higher score's frequency).
  - Example: scores +500 (14 MP), +450 (11 MP), +420 (4 MP); an assigned +430
    gets **9 MP** (= 4 + 5 = 11 − 2).
- **Never award more than a top or less than zero.**
- This is an approximation; the exact method is a full re-score. For **weighted**
  scores, apply this per component **before** weighting; **split** scores are
  handled similarly.

### 2.3 Boards with fewer results than other boards — matchpoints (§4.2.3)

Occurs with movements where some boards are played less often, with artificial
adjusted scores, fouled boards, or mis-marked boards.

**Neuberg formula (§4.2.3.2).** Used when **A > 3** or **A > E/3**. A
competitor's matchpoints on the board are scaled by E/A:

```
Match points = ((M + 1) / A) × E − 1
```

where:
- **M** = matchpoints earned considering only the group itself,
- **E** = number of scores expected on a (normal) board,
- **A** = actual number of results in the group.

Computed to the nearest **0.0001** of a matchpoint, with **0.00005 rounded away
from average**.

**Small sub-fields (§4.2.3.3).** Used when **A = 2 or A = 3** and the group is at
most a third of the total results:

- A group of **2** results: top = **65%**, bottom = **55%**.
- A group of **3** results: top = **70%**, bottom = **50%**.
- Intermediate and tied results are matchpointed as normal within the group.
- Equivalent percentage form: `Percentage = 60% + (M − (A − 1)) × 5%`, where
  **M is matchpoints on the doubled scale** (each pair beaten = 2, tie = 1).
  On the single scale `m = M/2` this reads `60% + (m − (A − 1)/2) × 10%`, giving
  65/55 for A=2 and 70/60/50 for A=3 as `m` runs 0..(A−1).

The uplift (compared with a flat average) is deliberate compensation to the
pairs who did not get a full comparison.

### 2.4 Boards with fewer results — Butler / cross-IMP (§4.2.4)

For individual, Butler, or cross-IMP events: **factor the frequencies by E/A**
first (as in matchpoints), then compute the datum / IMP each result against it as
normal. Worked example: an 8-table board with only 5 results is factored by 8/5
before the datum is computed from the central factored results.

### 2.5 Overall scoring across unequal boards (§4.2.5)

1. **All boards count equally** — a board with fewer results is scaled up so it
   is worth the same as a fully-played board (§4.2.3 / §4.2.4).
2. When contestants play **different numbers of boards**, the final score is
   scaled by the number of boards played (e.g. matchpoints expressed as a
   percentage).

### 2.6 Calculations and rounding (§4.2.6) — important

- **General (§4.2.6.1):** perform **all calculations without rounding during the
  calculation**. Then:
  - The score for a **single board** (the initial method of scoring) is rounded
    to the **nearest unit of scoring** (see §2.7 below), with **exact halves
    rounded away from average**.
  - If the final method is a form of **Victory Points**, the per-round/match
    score may need rounding to the unit of scoring, **exact halves away from
    average**.
  - When totalling board scores and **factoring** for different numbers of
    boards, compute to **sufficient precision** (don't round early).
  - Results may be **displayed** to fewer decimal places than are actually
    calculated (as is normal in MP pairs).
- **Butler datum (§4.2.6.2):** round the datum to the **nearest 10 points**, with
  **exact 5s rounded away from average**, so no swing falls between IMP-scale
  gaps.
- **Cross-IMPs → VP (§4.2.6.3):** total the (modified) cross-IMPs for the match,
  then round to the **nearest IMP**, **exact halves away from average**, before
  applying the VP scale, so no swing falls between VP-scale gaps.

### 2.7 Minimum unit of scoring (§8.12.3)

- **IMPs as the *initial* method of scoring:** the minimum unit is **1 IMP** (an
  application of Law 12C4 can produce 0.5 IMP).
- **IMPs as the *final* method of scoring** (no conversion to VP): the minimum
  unit becomes **0.1 IMP (or 0.25 IMP)**.

(The "unit of scoring" referenced by the rounding rules in §2.6 is this.)

---

## 3. Victory Point scoring (White Book §3.1)

### 3.1 Teams-of-four VP scale (§3.1.1)

The EBU uses the **WBF "discrete" (whole-number) VP scale** for teams-of-four,
adopted from 1 September 2013, as a table keyed by **match length (number of
boards)** and **IMP difference**.

> **Not reproduced here.** The discrete VP tables are large and do not transcribe
> reliably. Use the official White Book §3.1.1 table or the EBU's online VP
> calculator (which provides scales for any number of boards). A dedicated
> triangular-match (3- and 4-board) discrete scale also exists (§3.1.2).

### 3.2 Modified cross-IMP scoring for pairs, for conversion to VP (§3.1.3)

Also called **XIMPQ** / the **Probst formula**. On each board, a pair's
cross-IMPs are divided by √(rc/2):

```
XIMPQ = XIMP / sqrt( r × c / 2 )
```

where **r** = number of results on the board, **c = r − 1** = number of
comparisons, and **XIMP** = the pair's cross-IMP total (sum) for the board. The
source identifies this as EBUScore SwissPairs' `( / sqrt(rc/2))`.

> **Implementation note.** `swiss-vp-round.ts:buildXimpByBoard` matches this
> exactly: the cross-IMP sum (`computeCrossImps`) ÷ `Math.sqrt((r * c) / 2)`.

The **XIMPQ total for the round/match** is rounded to a whole number of IMPs
(see §2.6, §4.2.6.3), then the **teams-of-four VP scale (§3.1.1)** for the
number of boards in the match is applied.

Note: support for XIMPQ is limited; Swiss Pairs scored by cross-IMPs is uncommon.
(In EBUScore this is the "Probst formula".)

### 3.3 Swiss Pairs VP scale (§3.1.7)

For **matchpointed** Swiss Pairs, the VP for a match is read from a table keyed
by **match length** and the pair's **percentage of available matchpoints**. The
boundaries tighten toward 50% as matches get longer. Indicative values (confirm
against the official source):

| VP (win–loss) | ≤4 bds | 5–6 | 7–9 | 10–13 | 14–19 | 20–27 | 28–39 | 40–55 |
| ------------- | ------ | --- | --- | ----- | ----- | ----- | ----- | ----- |
| 10–10 (≤ %)   | 50.92  | 50.78 | 50.65 | 50.54 | 50.45 | 50.38 | 50.32 | 50.27 |
| 15–5 (≤ %)    | 61.08  | 59.45 | 57.83 | 56.53 | 55.45 | 54.57 | 53.83 | 53.21 |
| 19–1 (≤ %)    | 75.95  | 72.13 | 68.35 | 65.30 | 62.78 | 60.71 | 58.97 | 57.53 |
| 20–0          | > 75.95 | > 72.13 | > 68.35 | > 65.30 | > 62.78 | > 60.71 | > 58.97 | > 57.53 |

(The full table has a row for every VP from 10–10 to 20–0; only three rows plus
the top are shown here as a sample — see §3.1.7 for all rows.)

Notes:
- VPs in matches of **fewer than 5 boards** are **not recommended**.
- When a percentage is **exactly on a boundary**, take the **VP nearer to
  average**. Example: an 8-board match at exactly 56.23% scores **14–6**.
- **Odd number of pairs → two half-matches.** Each half-match is scored on a
  **10–0 VP scale** (a separate half-match percentage sub-table exists for 2 /
  3 / 4 / 5–6 / 7–9 / 10–13 boards), and any **missing** half-match is scored per
  §3.3.8 (see §4.4 below).
- A **continuous** VP scale is available via the EBU calculator.

### 3.4 Hybrid / other VP forms (§3.1.6)

Hybrid-IMP ("Pachabo") scoring blends a point-a-board component with a total-IMP
component. Teams-of-eight cross-IMP (Tollemache, §3.1.5) and the modified IMP
scale for aggregated teams-of-eight (§3.7.1) also exist. These are **largely out
of scope** for this app and are noted only for completeness.

---

## 4. Unplayable / cancelled boards (White Book §3.3)

A "fouled board" is defined by Law 87A. This covers any board that cannot be
played at a table, or was played incorrectly (e.g. arrow-switched). Much of §3.3
is TD procedure (whether to replay, who is penalised); the scoring outcomes that
matter here are below.

### 4.1 Pairs (§3.3.2)

- If the board was **played only once** in a particular form → **cancel it and
  give an artificial adjusted score** (§4.1.1.1 / §1.1 above).
- If it was **played more than once** → score it as a **sub-field** (§4.2.3 /
  §2.3 above). Example: a board played 20 times one way and 4 times another is
  two sub-fields (20 scores and 4 scores), not a 24-score field.

### 4.2 Teams — incorrect seating (§3.3.6)

- **Entire round/match void (§3.3.6.1):** if it cannot be replayed, in a
  VP-scored event **both teams score 40% of the VPs** (e.g. 8 on a 20–0 scale,
  4 on a 10–0 scale; 4.8 on a 12–0 hybrid, 6.4 on a 16–0 hybrid). If the **TD
  caused** the error, teams score the **converse** (e.g. 12/20 instead of 8/20).
- **Some boards played correctly (§3.3.6.2):** if **at least half** the
  round/match was played correctly, give **averages on the boards not played**
  and score the match on the **same VP scale** as a full match. If less than half
  was correct, replay enough to reach half, else the match is **void** (§3.3.6.1).

### 4.3 Teams — part or all of a match cannot be played (§3.3.7)

- Provided **at least half** the match can still be played, give an **artificial
  adjusted score of +3 / −3 IMPs per removed board**, expressed in the **basic
  method of scoring** (IMPs) regardless of any later VP conversion.
  - Example: 4 boards removed → 4 × 3 = 12 IMPs → 14–6 on the VP scale.
- If **less than half** can be played, the match is **void** → scored per §3.3.9.
- Timing rule: allow a full **7 minutes per board** when deciding how many boards
  can still be played; it is not normal to remove a board in the first ~8 minutes
  of a Swiss match.
- If **both** teams are at fault, each team's score is computed separately.

### 4.4 Pairs — part or all of a match cannot be played (§3.3.8)

Applies to **Swiss pairs** (and Swiss individual):

- Provided **at least half** can be played, give an artificial adjusted score
  (**AVE+ / AVE−**) per removed board, expressed in the basic method of scoring.
  - Example: a Swiss pairs match of 8 boards → 14–6.
- If less than half can be played → **void**, scored per §3.3.9.
- The §3.3.7 (c)/(d)/(e) principles (7-min/board, both-at-fault, aggravated
  circumstances) also apply.

### 4.5 Match declared void — scoring (§3.3.9)

When a match is void because **less than half** could be played:

- **AVE+** to the non-offending side and **AVE−** to the offending side on
  **half the boards** in the match (**rounded up**);
- **AVE/AVE** on the remaining boards.

---

## 5. Swiss events — mismatches and the draw

### 5.1 Mismatches (§3.5)

A **mismatch** occurs when a contestant is drawn against the wrong opponents.
Compare the current score of the **actual** opponents with that of the
**correct** opponents:

- If the difference is **greater than 5 VPs** (on a 20–0 scale) → it is a
  mismatch.
- If **5 VPs or less** → not a mismatch.
- Special case: if a contestant could correctly have been drawn against any of
  several opponents and the >5 VP difference holds for **some but not all** of
  them, it is **not** a mismatch.

In a given mismatched match, typically **one** side is mismatched and the other
is not.

**VP adjustment (§3.5.2, 20–0 scale):**

- Playing an opponent with **more** points than the correct opponent:
  - mismatch is **their own fault** → **actual score**;
  - **not their fault** → **5 + ¾ × actual score**. (Example: win 12–8 → 5 +
    ¾×12 = **14 VPs**.)
- Playing an opponent with **fewer** points than the correct opponent:
  - **own fault** → **actual score − ¼ of any VPs obtained in excess of 5**.
    (Example: win 13–7 → 13 − (13−5)/4 = **11 VPs**.)
  - **not their fault** → **actual score**.

The constant **5** is a quarter of the VP pool. For a **triangular match**
(a triple comparison, scored on the **10–0 scale**) the pro-rata adjustment is
therefore **2.5 + ¾ × actual score** (not-at-fault vs a higher opponent), and
the own-fault/lower case docks a quarter of the excess over **2.5**. The
implementation keys the constant to `pool/4` so both scales are handled by one
formula.

### 5.2 The Swiss draw (§3.6)

Mostly draw *philosophy* rather than scoring:

- **Ties when ranking for the draw (§3.6.1):** software splits ties to produce a
  ranking; manual draws break ties at random.
- **Triangular matches / triples (§3.6.2):** long vs short triangles; a pair of
  teams may meet "one and a half times" (one ordinary/long + one short triangle)
  — re-matches are disliked and avoided where the field allows.
- **Over-swissing (§3.6.3):** when too few teams / too many rounds force
  top-vs-far-lower pairings; mitigations include allowing limited re-matches
  (especially across sessions) or longer/fewer matches.

### 5.3 Assigning in Swiss teams (§3.6)

The draw pairs teams by current VP standings while avoiding repeat opponents,
using triangles to resolve an odd field (bye / short / long). (See §3.6.2 for
triangle placement and §3.6.3 for over-swissing.)

---

## 6. Late arrivals, withdrawals and absent contestants (White Book §2.3–§2.4)

> **Not yet implemented.** The app does not currently handle late arrivals or
> withdrawals, but it is expected to. This section captures the rules it will
> need so the scoring consequences are specified ahead of implementation. Much
> of §2.3–§2.4 is TD procedure (who may substitute, timing of stand-bys); the
> focus here is on **what score each affected contestant receives**.

### 6.1 "Without standing" — the core concept (§2.4.9)

Several cases below produce a contestant who plays **without standing**: a
stand-by, an emergency substitute, a player allowed in an event they did not
qualify for (e.g. to avoid a sit-out), or a contestant disqualified after the
event. The rule is:

- **The opponents' results count in full.**
- **The without-standing side's results do not count for itself**, and it does
  **not appear in the final ranking**.

### 6.2 Withdrawals — all-play-all events (§2.4.2)

- **Withdraws before completing half the event:** all scores obtained **against**
  the withdrawn contestant are **cancelled** for the overall score. (Any
  completed sessions still count for NGS grading and session-based masterpoints.)
- **Withdraws after half the event:** scores against them **stand**. Each
  opponent who can no longer play them receives the **best** of the following
  (any fraction resolved **upward** to the minimum unit of scoring):
  - (a) their **own average** over the entire event;
  - (b) the **converse** of the withdrawn contestant's average over the event;
  - (c) in a **VP** contest, **60% of the maximum VPs** — e.g. 12 on a 20–0
    scale, 6 on a 10–0 scale; hybrid 7.2 on a 12–0, 9.6 on a 16–0;
  - (d) in any **other** method of scoring, the **first three boards as AVE+ and
    the remainder as AVE**;
  - (e) in aggravated circumstances, a more generous indemnity.
- "All-play-all" means advertised as such in the Conditions of Contest — not
  merely a field small enough that everyone *could* meet.

### 6.3 Withdrawals — events that are not all-play-all (§2.4.3, §2.4.4)

- **At the end of a session (§2.4.3):** all scores against the withdrawn
  contestant **stand**; any contestant forced to **sit out** as a result is
  treated exactly as a **pre-scheduled sit-out** (so their percentage is scaled
  for the boards they played — see §2.5 "Overall scoring", §4.2.3/§4.2.5).
- **Part way through a session (§2.4.4):**
  - withdraws **before half** the session → scores against them are
    **cancelled**;
  - withdraws **after half** the session → scores against them **stand**, and any
    contestant forced to sit out as a result receives **AVE+**.

### 6.4 The score given *to* the withdrawing contestant (§2.4.5)

A withdrawal is normally treated as abandoning the event (the contestant does
not appear in the final ranking) and, unless the reason is acceptable, the
contestant is **disqualified**.

When the TD judges the reason **acceptable** (illness being the clearest):

- The contestant is given **AVE−** for the boards after withdrawal, up to a
  maximum of **half the event**, **plus** a per-board fine ranging from **0% to
  40%**. In effect this is a per-board score of **between 0% and AVE−** at the
  TD's discretion. A similar approach applies at other forms of scoring.
- For illness, the TD may instead choose to **remove the contestant entirely
  from the ranking** (e.g. to protect their NGS grade), if satisfied the reason
  is genuine.

### 6.5 The score for a missing / late / suspended contestant (§2.4.6)

For a contestant who is late, suspended, or has withdrawn (but is **not**
disqualified), their **unplayed** boards/matches are scored as:

- **all-play-all event:** the **converse** of their opponents' score under §6.2;
- **Swiss event:** per **§3.3.9** (the void-match formula — see §4.5);
- **otherwise:** **AVE−** on each unplayed board.

### 6.6 Late arrival (§2.3.3, §2.4.7, §2.4.8)

- **Start on time.** If a contestant has said they will be late, the TD starts
  the movement on time assuming they will arrive.
- **Retaining standing (§2.4.7):** unless already replaced by a stand-by, a late
  contestant **keeps their standing if they arrive in time to play half the
  boards** in the event. Their unplayed boards are scored per §6.5.
- **Half-table at the start (§2.4.7):** a pairs session may start a pair short.
  Boards that cannot be played meanwhile are scored **AVE+/AVE−**. **But if the
  missing pair never arrives**, those AVE+/AVE− scores are **cancelled** and the
  pairs forced to sit out instead have their scores **factored in the usual way**
  (the pre-scheduled-sit-out treatment).
- **Stand-bys (§2.3.3):** a stand-by acquires **full rights 45 minutes** after
  the advertised start if the latecomer gave **no** notice, or **90 minutes** if
  notice was given. Once the stand-by has full rights the latecomer **cannot
  reclaim** their place (and may be accommodated only if convenient). If the
  latecomer does arrive in time, the stand-by becomes a **substitute** (without
  standing — §6.1) for the boards they played.
- **Movement / timing (§2.4.8):** the TD sets the best movement for who is
  actually present; if a duly-entered contestant could not then be accommodated
  within **10 minutes** of the start, the TD delays the start by 10 minutes. A
  procedural penalty is normally given for a delay greater than 5 minutes.

### 6.7 Related, out of scope

- **Knockout bye/walkover and reinstatement (§2.4.10)** — knockout-specific; the
  app does not run knockouts.
- **Master points for a withdrawn contestant (§2.4.11)** — a Tournament
  Organiser/EBU matter, not a scoring calculation.
- **Correction periods (§2.5)** — the windows for requesting rulings and
  corrections; procedure rather than a scoring calculation.

---

## 7. Other rules (noted for completeness; likely out of scope)

- **Carry-forward score (§3.8).** For multi-stage events where qualifiers carry a
  score forward, ranked as a single field:

  ```
  CF = ½ × SQ × (NumQ / MaxQ) × (MaxF / NumF)
  ```

  where CF = carry-forward MP; SQ = MP obtained in the qualifier; MaxF/MaxQ =
  maximum MP available in the final / qualifier; NumF/NumQ = number of boards in
  the final / qualifier. Effect: qualifier boards carry **half** the weight of
  final boards. Relevant only if the app supports multi-stage qualifying.

- **Split-tie procedures (§3.2).** Contestants are tied on equal percentage by
  the final method; the Tournament Organiser specifies when and how ties are
  split. Relevant only if the app breaks ties in rankings.

---

## Index of White Book sections referenced

| §         | Topic                                              | Covered in |
| --------- | -------------------------------------------------- | ---------- |
| §2.3.3    | Stand-by players (45 / 90 min)                     | 6.6        |
| §2.4.2    | Withdrawal — all-play-all                          | 6.2        |
| §2.4.3–4  | Withdrawal — not all-play-all                      | 6.3        |
| §2.4.5    | Score given to a withdrawing contestant            | 6.4        |
| §2.4.6    | Score for a missing / late / suspended contestant  | 6.5        |
| §2.4.7    | Late arrival                                       | 6.6        |
| §2.4.8    | Movement / start-delay timing                      | 6.6        |
| §2.4.9    | "Without standing"                                 | 6.1        |
| §3.1.1    | WBF discrete teams-of-four VP scale                | 3.1        |
| §3.1.3    | Modified cross-IMP (XIMPQ / Probst) → VP           | 3.2        |
| §3.1.6    | Hybrid-IMP (Pachabo) VP                            | 3.4        |
| §3.1.7    | Swiss Pairs VP scale (% of available MP)           | 3.3        |
| §3.2      | Split-tie procedures                               | 7          |
| §3.3.2    | Unplayable board — pairs                           | 4.1        |
| §3.3.6    | Teams — incorrect seating                          | 4.2        |
| §3.3.7    | Teams — part/all of match cannot be played         | 4.3        |
| §3.3.8    | Pairs — part/all of match cannot be played         | 4.4        |
| §3.3.9    | Match void — scoring                               | 4.5        |
| §3.5      | Swiss mismatches                                   | 5.1        |
| §3.6      | Swiss draw / assigning                             | 5.2, 5.3   |
| §3.8      | Carry-forward score formula                        | 7          |
| §4.1.1.1  | Artificial adjusted (AVE+/AVE/AVE−)                | 1.1        |
| §4.1.1.2  | Assigned adjusted                                  | 1.2        |
| §4.1.1.3  | Split scores                                       | 1.3        |
| §4.1.1.4  | Weighted scores                                    | 1.4        |
| §4.2.1    | Weighted/split in MP frequencies                   | 2.1        |
| §4.2.2    | Assigned score not on board (manual)               | 2.2        |
| §4.2.3    | Fewer results — matchpoints (Neuberg)              | 2.3        |
| §4.2.4    | Fewer results — Butler/cross-IMP                   | 2.4        |
| §4.2.5    | Overall scoring across unequal boards              | 2.5        |
| §4.2.6    | Calculations and rounding                          | 2.6        |
| §8.12.3   | Minimum unit of scoring                            | 2.7        |
| §8.12.14  | Weighting must not benefit offenders               | 1.4        |
| §8.80.6   | "Session" window for AVE+/AVE−                     | 1.1        |

---

*Source: EBU White Book — Technical matters, 2025 edition (effective 1 August
2025), © English Bridge Union Ltd. Paraphrased for internal reference. Content
was rephrased for compliance with licensing restrictions; consult the official
White Book for authoritative wording and for all numeric VP tables.*
