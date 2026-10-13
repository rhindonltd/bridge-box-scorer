# Manual End-to-End Test Plan — moved

This single-file plan has been replaced by a comprehensive, per-area test suite
under **[`docs/e2e/`](e2e/README.md)**.

Start at **[`docs/e2e/README.md`](e2e/README.md)** — it has the device/environment
setup, the **fixture-setup guide** (a one-command seeding script that stands up a
game in a known state and plants a director token, so you can test a feature
without playing every board by hand), and links to each test file:

| File | Covers |
|---|---|
| [`e2e/01-core-flows.md`](e2e/01-core-flows.md) | Navigation, create, setup, join/seat, start, dual-side play, mismatch, deals, resilience |
| [`e2e/02-scoring-matchpoint.md`](e2e/02-scoring-matchpoint.md) | Pairs · Matchpoints (two-winner Mitchell + Howell) |
| [`e2e/03-scoring-ximp.md`](e2e/03-scoring-ximp.md) | Pairs · Cross-IMPs |
| [`e2e/04-scoring-teams.md`](e2e/04-scoring-teams.md) | Teams · IMP(VP) / IMP(agg) / BAM / PAB |
| [`e2e/05-scoring-swiss.md`](e2e/05-scoring-swiss.md) | Swiss Pairs & Swiss Teams + the Draw Next Round flow |
| [`e2e/06-director-rulings.md`](e2e/06-director-rulings.md) | Override, adjusted, weighted, cancel, voids, board removal, mismatch |
| [`e2e/07-special-scoring.md`](e2e/07-special-scoring.md) | Neuberg, AVE+/AVE− uplift, sit-out/bye, withdrawals, late/handover |
| [`e2e/08-timer-sync-display.md`](e2e/08-timer-sync-display.md) | Timer, live sync, Room Display, multi-section |
| [`e2e/09-settings-admin-cloud.md`](e2e/09-settings-admin-cloud.md) | Settings, WiFi, club, Cloud Backup, admin key |
| [`e2e/10-sharing-export-lifecycle.md`](e2e/10-sharing-export-lifecycle.md) | Share access, seat transfer, USEBIO/PBN export, delete |
| [`e2e/coverage-matrix.md`](e2e/coverage-matrix.md) | What logic each file covers |

The fixture seeding script lives at `src/scripts/seed-e2e-fixture.ts` and runs via
`npm run seed:e2e -- --scoring <METHOD> --play <all|partial|round1|none>`.
