# Module split: follow-ups

These came up while designing the module interfaces
([`modules.md`](modules.md)). None of them is needed for the split: the split
keeps today's behaviour, and these change behaviour or tidy unrelated code.
They can be done before, during or after the split, each with its own tests.

`file:line` references are to the code at the time of writing.

## Decided

| #   | Change                                                                                                                                                                            | Notes               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| F1  | The 60% sit-out credit applies to Swiss only. Remove it from ordinary pairs games, and give Swiss Pairs byes a credit, which they appear not to get today.                        | see below; check C1 |
| F2  | Not-played boards are left out of the USEBIO export.                                                                                                                              |                     |
| F3  | The USEBIO export pools sections exactly when the director chose combined ranking at setup (`combinedRanking`), as the leaderboard already does.                                  | check C2            |
| F4  | Remove `WithdrawalRecord.unplayedBoards` and mark the matching part of the handover design superseded.                                                                            | see below           |
| F5  | Fix the `TripleComparison` comment (`src/movement/swiss-teams/swiss-teams-pairing.ts:117`): long triples use board sets A, B and C too, not "R1"/"R2" (`TripleBoardSet`, `:129`). |                     |
| F6  | `mitchellSpecSchema` (`src/model/selected-movement.ts:36`) keeps the Mitchell variant fields `blackpool`, `doubleHesitation`, `revengeRounds` and `modified`.                     | see below           |

### F1: sit-out credit

The 60% credit is added by `swissSitOutScoredBoards`
(`src/services/leaderboard-service.ts:535`). Reading the code, it does the
opposite of what is wanted:

- It runs only for ordinary (board-pooled) pairs games. A Swiss Pairs game
  never takes that route, because its scoring is MP or Cross-IMP and both go to
  the Swiss VP scoring (`classifyEvent`, `src/model/event-format.ts:131`).
- The Swiss VP scoring skips `SIT_OUT` rows
  (`src/scoring/swiss/swiss-mp-vp-overall.ts:36`, `swiss-ximp-vp-overall.ts:39`,
  `swiss-vp-round.ts:136`), and nothing reads the bye's `BYE` match
  (`src/services/materialize-swiss-round.ts:319`).
- Mitchell and stored-movement sit-outs also write `SIT_OUT` rows
  (`src/services/materialize-movement.ts:226`), so the credit reaches them.

So a Swiss Pairs bye appears to get no credit, although e2e checks SITOUT-1
and SITOUT-2 (`docs/e2e/07-special-scoring.md`) expect 60% of the top for MP
and the field average for Cross-IMP. The fix: drop the credit from ordinary
pairs games, and score the Swiss Pairs bye from its `BYE` match.

The USEBIO export gives no sit-out credit at all, so after F1 it agrees with
the leaderboard for ordinary pairs games.

### F4: `unplayedBoards`

`WithdrawalRecord.unplayedBoards` (`src/db/games/queries/ranking-exclusions.ts:81`)
was added in commit `3e17781` ("Handover logic"). It carried the boards an
arriving pair missed before a handover, so they could be scored AVE−. Commit
`7db839f` ("Add handover capability") removed the code that set and read it,
and left the field. Today an arriving pair is ranked only on the boards it
played (`leaderboard-service.ts:1027`), which e2e checks SUB-9 and SUB-10
(`docs/e2e/12-handover-substitution.md`) confirm.

`docs/design/seat-occupancy-handover.md` still describes the old AVE− rule
(`:44`–`:48`, `:276`–`:283`) and needs a "superseded" note there. If the AVE−
rule is wanted after all, that is a new feature.

### F6: Mitchell variant fields

The generators already support all four fields
(`src/movement/mitchell/mitchell.ts:52`, `:60`; `blackpool.ts:46`;
`double-hesitation-mitchell.ts:57`), so this is a schema fix. The movement
picker's list (`MITCHELL_SUBTYPES`,
`src/movement/recommendations/movement-descriptor.ts:36`) offers Hesitation
and Web but not Blackpool or Double Hesitation. Offering those two is a
separate choice.

## Open

- **O1. Two-winner and baseline in the export.**
  - For a two-winner Mitchell the leaderboard ranks North/South and East/West
    separately; the export publishes one ranking. Should the export publish
    two?
  - The leaderboard lists every seated pair, with a zero line if it has no
    result. After F2 this only affects a pair that sat down but played no
    board. Should it appear in the export?
- **O2. Handed-over seats in the Swiss Pairs export.** The leaderboard scores
  a stand-in's boards and the arriving pair's boards separately (for example
  `A1NS#12` and `A1NS`). The Swiss Pairs export credits every board at that
  seat to one pair. The teams exports get the seat occupancies directly
  (`src/services/usebio-service.ts:227`) and appear to handle substitutes their
  own way. Recommendation: split the seat as the leaderboard does.
- **O3. A pair that never arrives, in Swiss and teams exports.** A seat
  marked "expected late" whose pair never turns up does not stop finalising,
  because its boards count as not needing a result
  (`src/db/games/queries/board-resolution.ts:41`–`:43`). For Swiss and teams
  formats the leaderboard credits those opponents AVE+ and leaves the seat out
  of the ranking (`leaderboard-service.ts:1039`–`:1052`). The export does
  neither, so the opponents score lower in the published file, and Swiss
  Teams matches against the empty seat are not voided. Recommendation: match
  the leaderboard.

## Checks

- **C1.** Confirm with a test that a Swiss Pairs bye gets no credit today and
  a Mitchell sit-out gets 60% (F1).
- **C2.** How USEBIO expresses a ranking across sections (F3).
