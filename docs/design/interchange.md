# Interchange module

`src/modules/interchange` holds the file formats the app writes and reads:
USEBIO 1.2 results files, PBN deal files, and PBN parsing for deal import. It
depends on the kernel only, and it lays results out without computing any of
them. The services score the event with `applyRulings` and `scoreEvent`, the
same run the leaderboard uses, and pass the finished numbers in. The published
file then agrees with the leaderboard by construction.

There are two entries:

- `@/modules/interchange` covers PBN: `generatePbn` and `parsePbnFile`. It is
  browser-safe, because the deal-import page parses PBN in the browser.
- `@/modules/interchange/usebio` is the USEBIO writer `generateUsebioXml` and
  its data types. Its XML library (`xmlbuilder2`) does not load in the
  browser, so it is a separate, server-side entry. The core lint rule allows
  it next to `@/modules/movement-catalog/server`.

`parseUsebio` in `src/lib/ebu/client.ts` is an EBU web call, not a file
format, so it stays in the core (it belongs with the integrations, §11 of
[`modules.md`](modules.md)). `src/model/deal.ts` stays in the kernel: the deal
screens, socket handlers and database use it.

## Step 1, as built (no change to the files written)

- **PBN.**
  - `src/lib/pbn/generate-pbn.ts` became `interchange/pbn/generate-pbn.ts`.
  - `src/model/pbn-file.ts` became `interchange/pbn/pbn-file.ts`.
- **USEBIO writer.**
  - `format-contract.ts`, `traveller-line.ts`, `team-pairing.ts` and the XML
    layout in `generate-usebio.ts` moved to `interchange/usebio/`.
  - `buildTravellerLine(outcome, lead, score)` now takes the contract score
    from its caller.
  - The pairs writer takes each line's contract score and matchpoints or
    IMPs (`UsebioBoardResult.score`, `.lineScore`) and each section's
    `placings`, instead of scoring them itself.
- **What stays in the core for now.**
  - The pairs export's scoring moved to `src/services/usebio/score-mp-pairs.ts`
    (`scoreMpPairs`). That is the old `computeOverallRanking`,
    `computeBoardScores` and score descriptors, unchanged.
  - The four `assemble-*.ts` moved to `src/services/usebio/`, because they
    still call scoring.
- **Check.** The sample files (`npm run usebio-samples`) are byte-for-byte
  identical to the ones written before the move.

## What scoring must add (step 2)

The export needs per-line and per-match figures. `scoreEvent` works them out
today and then throws them away. They become part of `EventScore`, with their
types in the kernel, as `src/model/leaderboard.ts` already does for the
standings.

```ts
// src/model/event-detail.ts (new kernel types)

/** One traveller line as scored, after every standings pass. */
export interface ScoredLine {
  field: string; // section, or the combined label when pooled
  section: string;
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  ns: string; // scored ids (handover-split ids included)
  ew: string;
  outcome: BoardOutcome;
  lead: Card | null; // directorOverrideLead ?? confirmedLead
  nsScore: number | null; // contract score (SCORE element)
  nsValue: number; // matchpoints or cross-IMPs
  ewValue: number;
  top?: number; // MP only
}

/** One Swiss Pairs head-to-head (a full match or a real half). */
export interface PairsMatchResult {
  section: string;
  round: number;
  ns: string;
  ew: string;
  nsVp: number;
  ewVp: number;
  boardNumbers: number[];
}

/** One teams match or triple comparison. Points are on the method's scale. */
export interface TeamMatchResult {
  section: string;
  round: number;
  home: string;
  opponent: string;
  boards: {
    boardNumber: number;
    home: number | null;
    opponent: number | null;
  }[];
  homeScore: number;
  opponentScore: number; // VP, net IMPs, or board points
  void: boolean;
}

// EventScore gains:
//   lines: ScoredLine[]                (board-pooled pairs; replaces adjustedBoards)
//   pairsMatches: PairsMatchResult[]   (Swiss Pairs)
//   teamMatches: TeamMatchResult[]     (all teams formats)
//   rowScores: per ruled row, the contract score, for the SCORE element
```

- The teams scorers are restructured to build `TeamMatchResult`s first and
  then sum them into the standings. The match VP the file publishes is then
  the VP the leaderboard totals.
- The Swiss Pairs scorers keep `scoreSwissVpRound`'s matches.
- The leaderboard's output is unchanged: its tests and the scoring journeys
  must pass as they are.

## How the files change (step 3)

Agreed with the user. E6 was changed from the first proposal; the others are
as recommended.

| #   | Change                                                                                   | Decision                                                                                                                                                                                                                                                                                                                                                                           |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | **O4, Cross-IMP placings.** Today every pair gets 0.00% and place 1.                     | Rank on the leaderboard's figure (average cross-IMPs per board). Write it as TOTAL_SCORE, with no PERCENTAGE for Cross-IMP. Check the element names against the USEBIO 1.2 DTD.                                                                                                                                                                                                    |
| E2  | **Traveller-line matchpoints and cross-IMPs.** Today they are the flat traveller values. | Write the adjusted values, so each pair's lines add up to its total, as the scorecard does since D5.                                                                                                                                                                                                                                                                               |
| E3  | **F2, not-played boards.**                                                               | Leave them out.                                                                                                                                                                                                                                                                                                                                                                    |
| E4  | **F3, sections.**                                                                        | Follow `combinedRanking` for every format. When it is on, or there is only one section, write one SECTION with the pooled field, its scores and places, and section-qualified pair numbers. When it is off, write one SECTION per section. This is provisional until C2 (how BridgeWebs reads a pooled multi-section file) is checked. The fallback keeps one SECTION per section. |
| E5  | **O1a, two-winner Mitchell.**                                                            | Two rankings: WINNER_TYPE 2, each pair placed within its direction, as on the leaderboard.                                                                                                                                                                                                                                                                                         |
| E6  | **O1b, a seated pair with no result.**                                                   | **Leave it out of the file entirely (decided by the user).** Score with `baseline: false` and write no PAIR for it.                                                                                                                                                                                                                                                                |
| E7  | **O2, handed-over seats in Swiss Pairs.**                                                | Split the seat as the leaderboard does. The stand-in gets its own PAIR, is left out of the placings, and still counts for its opponents.                                                                                                                                                                                                                                           |
| E8  | **O3, an expected-late pair that never arrives (Swiss, teams).**                         | As the leaderboard does: its opponents get AVE+, the seat is not ranked, and Swiss Teams matches against it are voided.                                                                                                                                                                                                                                                            |
| E9  | **Swiss Teams bye.**                                                                     | 12 VP in the total, with no MATCH element (as Swiss Pairs byes since F1).                                                                                                                                                                                                                                                                                                          |
| E10 | **Teams IMP aggregate and BAM/PAB voids and withdrawals.**                               | Whatever the leaderboard does.                                                                                                                                                                                                                                                                                                                                                     |
| E11 | **Pairs lead.**                                                                          | Use `directorOverrideLead ?? confirmedLead`, as the Swiss and teams files do.                                                                                                                                                                                                                                                                                                      |
| E12 | **Ties.**                                                                                | Use the scoring `rank` (the leaderboard's tie rule).                                                                                                                                                                                                                                                                                                                               |

## Steps

1. **Module skeleton.** Done (above).
2. **Scoring detail.** Add the kernel types and the new `EventScore` fields,
   and restructure the teams scorers onto `TeamMatchResult`. The leaderboard,
   scorecard and the §3.5 replay must be unchanged.
3. **Export onto `scoreEvent`.**
   - `usebio-service` becomes a thin adapter, sharing the leaderboard's read.
   - The assemblers are rewritten as interchange layout over `EventScore`.
   - `score-mp-pairs.ts` is deleted.
   - Apply E1–E12 and update the USEBIO tests.
   - Regenerate the samples and validate them against the DTD.
   - Run the export, scoring and Swiss journeys.
4. **Docs.** Mark F2, F3 and O1–O4 done in
   [`modules-follow-ups.md`](modules-follow-ups.md). Update the director guide
   only if what the director sees changes.

## Risks

- Step 2 touches the teams scorers. The leaderboard tests and the scoring
  journeys guard it.
- E4 depends on C2. If it cannot be checked, use the fallback.
- The EBU and BridgeWebs receive changed files after step 3. The upload
  journeys use mocks, so a manual upload of one real event is the final check.
