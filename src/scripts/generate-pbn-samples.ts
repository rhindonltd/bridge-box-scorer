import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

import { generatePbn } from "@/lib/pbn/generate-pbn";
import { clockwiseFrom, dealerFor, pbnStringToHand } from "@/model/deal";
import { Deal } from "@/model/common";

/**
 * Generate an example PBN file so it can be checked against an external PBN
 * reader / validator. Writes to ./pbn-samples/ at the workspace root.
 *
 * Run with: npm run pbn-samples
 *
 * The data is hand-built (not read from a game DB) so the sample is
 * self-contained and reproducible. We start from one canonical 52-card deal and
 * rotate it across three boards so each board carries a valid, distinct deal
 * with the correct board-derived dealer.
 */

// Four fixed hands, listed in the clockwise order they are dealt starting from
// the board's dealer. Across boards the dealer advances (N, E, S, ...) while
// this sequence stays put, so the physical cards rotate one seat per board —
// mirroring how a single set of hands cycles through the seats.
const HAND_SEQUENCE: readonly string[] = [
  "AKJ.Q982.T743.65",
  "432.AK.AKQJ.T982",
  "T98.JT74.65.AKQJ",
  "Q765.653.982.743",
];

/**
 * Build the deal for one board. Starting from `HAND_SEQUENCE` (the clockwise
 * hand order for board 1), rotate the sequence right by (boardNumber - 1) and
 * assign it to seats clockwise from that board's dealer. This makes each board
 * a genuinely distinct deal while keeping the whole file reproducible.
 */
function dealForBoard(boardNumber: number): Deal {
  const n = HAND_SEQUENCE.length;
  const shift = ((boardNumber - 1) % n + n) % n;
  // Right-rotate by `shift`: element i comes from (i - shift) mod n.
  const rotated = HAND_SEQUENCE.map(
    (_, i) => HAND_SEQUENCE[(i - shift + n) % n],
  );

  const seats = clockwiseFrom(dealerFor(boardNumber));
  const deal = {} as Deal;
  seats.forEach((seat, i) => {
    deal[seat] = pbnStringToHand(rotated[i]);
  });
  return deal;
}

/** Build the deals map for a set of board numbers. */
function sampleDeals(boardNumbers: number[]): Map<number, Deal> {
  const map = new Map<number, Deal>();
  for (const boardNumber of boardNumbers) {
    map.set(boardNumber, dealForBoard(boardNumber));
  }
  return map;
}

function main() {
  const outDir = path.join(process.cwd(), "pbn-samples");
  mkdirSync(outDir, { recursive: true });

  const pbn = generatePbn({
    eventName: "Club Game",
    eventDate: "2026-09-17T00:00:00.000Z",
    site: "Club",
    deals: sampleDeals([1, 2, 3]),
  });

  const filePath = path.join(outDir, "sample.pbn");
  writeFileSync(filePath, pbn, "utf8");
  console.log(`✅ Wrote ${filePath}`);

  process.exit(0);
}

main();
