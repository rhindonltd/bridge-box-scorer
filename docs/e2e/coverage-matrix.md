# Coverage matrix

What app logic each test file covers, so you can see the whole picture and spot
gaps. "Logic area" is grouped by the subsystem it exercises.

## Scoring methods (one test group each)

| Scoring method | Internal id | Movement used | File | Key checks |
|---|---|---|---|---|
| Pairs · Matchpoints (two-winner) | `MP` | standard Mitchell | [02](02-scoring-matchpoint.md) | `MP-1..8` NS/EW split, percentage |
| Pairs · Matchpoints (one-winner) | `MP` | Howell | [02](02-scoring-matchpoint.md) | `MP-9..11` single field |
| Pairs · Cross-IMPs | `XIMP` | Mitchell | [03](03-scoring-ximp.md) | `XIMP-1..9` cross-IMP, negatives |
| Teams · IMP (Victory Points) | `IMP_VP` | Round Robin | [04](04-scoring-teams.md) | `TEAM-1..5` VP scale |
| Teams · IMP (aggregate) | `IMP` | Round Robin | [04](04-scoring-teams.md) | `TEAM-6..8` net IMPs |
| Teams · Board-a-Match | `BAM` | Round Robin | [04](04-scoring-teams.md) | `TEAM-9..11` boards won |
| Teams · Point-a-Board | `PAB` | Round Robin | [04](04-scoring-teams.md) | `TEAM-12..13` 2pt scale |
| Swiss Pairs · MP→VP | `MP` (SWISS) | Swiss Pairs | [05](05-scoring-swiss.md) | `SWISS-1..2` VP from % |
| Swiss Pairs · XIMP→VP | `XIMP` (SWISS) | Swiss Pairs | [05](05-scoring-swiss.md) | `SWISS-3` VP from cross-IMP |
| Swiss Teams · IMP(VP) | `IMP_VP` (SWISS) | Swiss Teams | [05](05-scoring-swiss.md) | `SWISS-20..26` barometer VP |

## Movements

| Movement | Draw style | File | Checks |
|---|---|---|---|
| Mitchell (two-winner) | up front | 02 | `MP-3` |
| Mitchell (arrow-switched, one-winner) | up front | 02 (note) | via Howell path logic |
| Howell / library (SPEC) | up front | 02 | `MP-9..11` |
| Swiss Pairs (bye + half-matches) | round by round | 05 | `SWISS-4..19` |
| Swiss Teams (bye + triples) | round by round | 05 | `SWISS-20..26` |
| Round Robin Teams | up front | 04 | `TEAM-*` |

## Special scoring behaviours

| Behaviour | §/White Book | File | Checks |
|---|---|---|---|
| Neuberg / short-board equalisation | §4.2.3 | [07](07-special-scoring.md) | `NEUBERG-1..4` |
| AVE+/AVE− better-than-average uplift | §4.1.1.1 | 07 | `AVEUP-1..3`, `AVEUP-IMP-1` |
| Sit-out / bye credit | — | 07 | `SITOUT-1..2`, `SITOUT-TEAMS-1..2` |
| Withdrawals | §2.4.3–§2.4.9 | 07 | `WITHDRAW-1..5`, `WITHDRAW-TEAMS-1` |
| Late arrival / handover | §2.4.7 | 07 | `LATE-1..5` |
| Swiss half-matches | — | 05 + 07 | `SWISS-17..19`, `HALFMATCH-1..3` |
| §3.5 mismatch detection | §3.5 | [06](06-director-rulings.md) | `RULE-24..27` |

## Director rulings

| Ruling | §/White Book | File | Checks |
|---|---|---|---|
| Override / played contract | — | [06](06-director-rulings.md) | `RULE-1..4` |
| Adjusted score | — | 06 | `RULE-5..7` |
| Weighted score | — | 06 | `RULE-8..10` |
| Cancel / foul board | §3.3.2 | 06 | `RULE-11..13` |
| Void match (pairs) | §3.3.8 | 06 | `RULE-14..16` |
| Void match (teams) | §3.3.6/§3.3.9 | 06 | `RULE-17..20` |
| Board not played (teams) | §3.3.7 | 06 | `RULE-21..23` |
| Mismatch | §3.5 | 06 | `RULE-24..27` |
| Enter deals (director) | — | 06 | `RULE-28..30` |

## Core & platform

| Area | File | Checks |
|---|---|---|
| Home & navigation | [01](01-core-flows.md) | `HOME-*` |
| Create (2-step form, validation, event types, scoring options, BridgeWebs) | 01 | `CREATE-*` |
| Setup (tables, movement, timer config) | 01 | `SETUP-*` |
| Join & seat (live, duplicate guard) | 01 | `JOIN-*` |
| Start (readiness, guards) | 01 | `START-*` |
| Dual-side play (match, mismatch, PO/NP, lead, move) | 01 | `PLAY-*` |
| Deal entry (player) | 01 | `PLAY-11` |
| Resilience / reconnect | 01 | `RES-*` |
| Timer config & live controls | [08](08-timer-sync-display.md) | `TIMER-*`, `SETUP-8..10` |
| Live sync & Room Display | 08 | `DISP-*` |
| Swiss between-rounds timer | 08 | `TIMER-10..11` |
| Multi-section (+ combined-ranking off) | 08 | `SEC-*` |
| Settings: admin unlock | [09](09-settings-admin-cloud.md) | `SET-1..4` |
| WiFi | 09 | `SET-5..8` |
| Club information | 09 | `SET-9..10` |
| BridgeWebs config | 09 | `SET-11..12` |
| Cloud Backup (enabled + disabled states) | 09 | `CLOUD-1..7` |
| Admin key update & logout | 09 | `SET-13..15` |
| Share director access | [10](10-sharing-export-lifecycle.md) | `SHARE-*` |
| Change device / seat transfer | 01 + 10 | `XFER-*` |
| USEBIO / PBN / BridgeWebs export (+ gating) | 10 | `EXP-*` |
| Delete game & completed-game redirect | 10 | `DEL-*` |

## Known gaps / out of scope

- **Accessibility (WCAG):** needs assistive-tech + expert review; not covered.
- **Arrow-switched Mitchell as its own fixture:** the seeder emits a standard
  (two-winner) Mitchell; the one-winner path is covered via Howell. Add an
  arrow-switched Mitchell manually if you want to exercise that specific
  rehydration path.
- **Appliance update flow** (receiving software updates): a subscription/ops
  feature outside the in-app functional surface.
