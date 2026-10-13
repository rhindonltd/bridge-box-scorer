# Manual End-to-End Test Plan — Bridge Box Scorer

A **press-this-button** checklist for manually testing the app end to end on a
real **Bridge Box**. It is written so you can hand it to someone who has never
seen the app and they can execute it exactly, ticking each box.

The goal is **high confidence the app works correctly** on the appliance — the
place automated tests can't fully reach: real network, real devices, real
multi-device sync, timer wall-clock, WiFi, Cloud Backup, and the full set of
scoring methods.

This plan is split into focused files so you can run just the part you care
about. Every test case has a stable **ID** (e.g. `MP-3`, `RULE-7`) so failures
can be reported precisely.

---

## The test files

| File | Covers |
|---|---|
| [`01-core-flows.md`](01-core-flows.md) | Home & navigation, create game, setup (tables/movement/timer), join & seat, start, **dual-side play**, mismatch, Pass Out / Not Played, deal entry, resilience/reconnect |
| [`02-scoring-matchpoint.md`](02-scoring-matchpoint.md) | **Pairs · Matchpoints** — two-winner Mitchell (NS/EW split) and one-winner Howell; percentage leaderboard |
| [`03-scoring-ximp.md`](03-scoring-ximp.md) | **Pairs · Cross-IMPs** — average cross-IMP per board leaderboard |
| [`04-scoring-teams.md`](04-scoring-teams.md) | **Teams** — IMP (Victory Points), IMP (aggregate net IMPs), Board-a-Match, Point-a-Board |
| [`05-scoring-swiss.md`](05-scoring-swiss.md) | **Swiss** — Swiss Pairs (MP→VP and XIMP→VP), Swiss Teams; the **Draw Next Round** preview → edit → commit flow, byes, half-matches, triples |
| [`06-director-rulings.md`](06-director-rulings.md) | Director corrections: override, adjusted score, weighted score, cancel/foul, void (pairs), void (teams), board removal (teams), Swiss mismatch |
| [`07-special-scoring.md`](07-special-scoring.md) | EBU scoring subtleties: Neuberg / short-board equalisation, AVE+/AVE− better-than-average uplift, sit-out/bye credit, withdrawals, late arrival / handover |
| [`08-timer-sync-display.md`](08-timer-sync-display.md) | Session timer config & live controls, live multi-device sync, Room Display (leaderboard + timer), multi-section cycling |
| [`09-settings-admin-cloud.md`](09-settings-admin-cloud.md) | Settings: admin unlock, WiFi, Club Information, **Cloud Backup**, update admin key, logout |
| [`10-sharing-export-lifecycle.md`](10-sharing-export-lifecycle.md) | Share director access, change device / seat transfer, USEBIO & PBN export, BridgeWebs upload, delete game & completed-game redirect |
| [`coverage-matrix.md`](coverage-matrix.md) | Which app logic each file covers, so you can see the whole picture at a glance |

**Suggested order for a full pass:** 01 → one or more of 02–05 → 06 → 07 → 08 →
09 → 10. For a quick smoke test, 01 alone exercises the core play loop.

---

## How to use this document

- Every step names the **exact button/label** to tap, in `**bold**`. Labels are
  quoted as they appear on screen.
- **Expected** lines say what you should see. If reality differs, the step
  **fails** — note the check ID.
- Tick `[ ]` → `[x]` as you go.
- "Tap" = touch/click. On a laptop it's a click.

### Devices

Most of the plan needs **three** devices: one **DIRECTOR**, and **two players**
(a NS pair and an EW pair) to prove dual-side confirmation and live sync. A
fourth as a **Room Display** is recommended. Label them with tape —
"DIRECTOR", "NS", "EW", "DISPLAY".

The **scoring** files (02–07) can mostly be checked on a **single device** using
a seeded fixture (see below): you plant a director token and inspect the
leaderboard/traveller directly, without playing boards live on multiple devices.

### Before you start — environment

| Check | Action | Expected |
|---|---|---|
| ☐ ENV-1 | Switch the Bridge Box on and wait ~1 minute. | It powers up. |
| ☐ ENV-2 | On each test device, join the **Bridge Box's own WiFi network**. | Connects; no internet needed. |
| ☐ ENV-3 | Open the browser and go to the box's address (e.g. `http://bridgebox.local` or the printed IP). | The **home screen** loads. |
| ☐ ENV-4 | Open `/<address>/healthz`. | JSON `"status":"ok"` + a version. If `error`/503, **stop** — the box isn't healthy. |
| ☐ ENV-5 | Note the **version** at the bottom of the home screen. | Matches the release under test. |

---

## Fixture setup — stand up a game in a known state

Playing a whole game by hand on three devices just to test (say) a scoring
correction is slow. Instead, a **seeding script** provisions a game straight
into the box's databases — seated, started, and with boards already played —
and prints a **director token** you plant in the test browser.

### Why a token is needed

Director-only actions (corrections, draws, export) are gated server-side: the
browser must hold a valid **director token** for that game. The token is a real
server session (stored in the box's `system` database), so you can't just
invent one in the browser — but the seeding script **creates** one for you and
prints it.

- **Director token** — browser `localStorage`, key `director:<gameId>`, value is
  the raw token string.
- **Player token** — key `player:<gameId>`, JSON `{ "startingPosition", "token" }`
  (only needed if you want to drive the *player* side; the fixtures don't
  require it — results are seeded directly).
- **Admin key** — separate; gates device **Settings** only, not game management.

### Step 1 — run the seeder (on the box, or any machine pointed at the box's data)

The script runs like the other maintenance scripts, with the same `server-only`
shim and the box's own `.env` so it writes the real databases:

```bash
# A Matchpoint pairs game, 3-table Mitchell, every board played:
npm run seed:e2e -- --scoring MP --play all

# A Cross-IMP pairs game with ~half the boards played (test "finish the game"):
npm run seed:e2e -- --scoring XIMP --play partial

# A Teams IMP(VP) Round Robin, only round 1 played:
npm run seed:e2e -- --scoring TEAMS_IMP_VP --tables 4 --play round1

# A Swiss Pairs game ready to draw round 2 from the Movement screen:
npm run seed:e2e -- --scoring SWISS_PAIRS_MP --tables 4 --rounds 5 --play round1
```

It prints something like:

```
✅ E2E fixture ready

   Fixture      : Pairs · Matchpoints · standard two-winner Mitchell
   gameId       : 96a540bbd2178624d450809ea08cb32c
   directorToken: e2e-7b1c…-…
   field        : 3 tables, section A, full seating
   boards played: 18 (--play all)

   Plant the director token in the test browser's console:
   localStorage.setItem("director:96a540…", "e2e-7b1c…")
```

#### `--scoring` fixtures

| Value | Game |
|---|---|
| `MP` | Pairs · Matchpoints · standard two-winner Mitchell |
| `MP_HOWELL` | Pairs · Matchpoints · Howell (one-winner, movement library — pass `--specId` if your box seeds Howell under a different id) |
| `XIMP` | Pairs · Cross-IMPs · Mitchell |
| `TEAMS_IMP_VP` | Teams · IMP (Victory Points) · Round Robin |
| `TEAMS_IMP_AGG` | Teams · IMP (aggregate net IMPs) · Round Robin |
| `TEAMS_BAM` | Teams · Board-a-Match · Round Robin |
| `TEAMS_PAB` | Teams · Point-a-Board · Round Robin |
| `SWISS_PAIRS_MP` | Swiss Pairs · Matchpoint→VP (round 1 only) |
| `SWISS_PAIRS_XIMP` | Swiss Pairs · Cross-IMP→VP (round 1 only) |
| `SWISS_TEAMS` | Swiss Teams · IMP (VP) (round 1 only) |

#### Other flags

| Flag | Default | Meaning |
|---|---|---|
| `--tables` | 3 for Mitchell, 4 for teams | Table count. **Mitchell needs an ODD count; teams need EVEN** — the script rejects a bad parity with a clear message. |
| `--rounds` | 2 | Rounds the movement is configured for. |
| `--boards` | 3 | Boards per round. |
| `--play` | `partial` | `all` (every materialised board), `partial` (~first half of rounds), `round1` (round 1 only), `none` (seated + started, nothing played). |
| `--specId` | — | Movement-library spec id for `MP_HOWELL`. |

> **Swiss note:** Swiss Pairs and Swiss Teams only **materialise round 1** at
> start (later rounds are drawn live), so `--play all` on those still fills just
> round 1. That's the right state to test the **Draw Next Round** flow (file 05).

### Step 2 — plant the token in the test browser

1. On the test device, open the app at the box's address.
2. Open the browser **developer console** (on a tablet, use a laptop browser
   pointed at the same box, or a remote-debug session).
3. Paste the `localStorage.setItem(...)` line the script printed.
4. Go to **Manage Games** and open the **E2E …** event. You now have full
   director access to the seeded game — jump straight to the feature under test.

### Resetting

Each run creates a **new** game (new `gameId`), so fixtures never collide. Delete
a finished fixture game from **Manage Game Menu → Delete Game**, or leave it —
the next run is independent.

---

## Test data naming

Seeded fixtures name players `P<seat>` (e.g. `PA1NS North / PA1NS South`) and
teams `Team A1NS`, so a seat is obvious at a glance. When seating by hand, pick
memorable names (e.g. **Alice North / Bob South**, **Carol East / Dave West**)
so mismatches stand out.

---

## Sign-off (per run)

| Field | Value |
|---|---|
| Tester name | |
| Date | |
| App version | |
| Files executed | |
| Device(s) used | |
| Overall result | ☐ Pass ☐ Pass with notes ☐ Fail |

**Failures / notes** (reference the check ID, e.g. `MP-4`):

```
(record here)
```

---

## Scope & known limitations

- **Cloud Backup** depends on whether the box is cloud-configured and entitled
  (a subscription feature). On a box that isn't, the "not enabled" state is the
  correct, expected result — see file 09.
- **Accessibility:** automated checks pass, but full WCAG conformance needs
  manual testing with assistive technology (screen reader, keyboard-only) and
  expert review — out of scope for this functional plan.
- The seeding script writes to the **box's live databases**. Use it on a test
  box or a box whose data you're happy to add games to; delete fixture games
  when done.
