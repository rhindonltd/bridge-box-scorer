// Generate Web Mitchell PSMovements.txt blocks for EVEN table counts.
//
// The rule was reverse-engineered from the bridgecentral.com 12-table 8-round
// and 9-round Web Mitchell layouts and reproduces both exactly:
//   - NS pair = table number (stationary).
//   - EW pair = wrap(table - ewDist(round, rounds), tables), where ewDist is
//     round-1 for the first half of the rounds and, for the second half, round
//     (an even round-count skips one pair) or round-1 (odd round-count, no skip).
//   - Board sets: first half of tables ascending (set = wrap(table + round-1,
//     rounds)); second half descending from wrap(H - (table - H), rounds).
//
// ONLY valid for EVEN table counts (the movement splits into two equal halves
// H = tables/2). Odd counts are a different (sectioned/rover) construction and
// are intentionally out of scope here.
//
// Run: npx tsx scripts/gen-web-mitchell.mjs   (prints blocks; use --write to append)

import fs from "node:fs";

const wrap = (v, m) => ((((v - 1) % m) + m) % m) + 1;

/**
 * How many tables the EW pairs have effectively advanced by the start of
 * `round`, expressed as a standard Mitchell "skip" progression:
 *
 *   - EW move up one table each round (displacement round-1), AND
 *   - for an even round count, take a single extra skip at the half-way point
 *     (after round rounds/2), giving displacements 0,1,...,H-1, H+1,...,rounds.
 *     This is the classic even-table Skip Mitchell move and is exactly what
 *     keeps the twin-set Web replay-free (verified: no EW pair ever meets the
 *     same physical board twice).
 *   - for an odd round count no skip is needed (0,1,...,rounds-1).
 */
function ewDist(round, rounds) {
  const skipAfter = rounds / 2; // half-way skip point (even rounds only)
  const extraSkip = rounds % 2 === 0 && round > skipAfter ? 1 : 0;
  return round - 1 + extraSkip;
}

/**
 * Even-table Web Mitchell. tables[t-1] = array of [ns, ew, boardSet, copy].
 * Two equal zones (Set A tables 1..H, Set B tables H+1..T), standard halfway
 * skip in the EW move.
 */
export function webMitchellEven(tables, rounds) {
  if (tables % 2 !== 0) {
    throw new Error("webMitchellEven requires an even table count");
  }
  const half = tables / 2;
  const sets = rounds;
  const out = [];
  for (let t = 1; t <= tables; t++) {
    const rows = [];
    for (let r = 1; r <= rounds; r++) {
      const ns = t;
      const ew = wrap(t - ewDist(r, rounds), tables);
      const set =
        t <= half
          ? wrap(t + (r - 1), sets)
          : wrap(wrap(half - (t - half), sets) - (r - 1), sets);
      rows.push([ns, ew, set, t <= half ? "A" : "B"]);
    }
    out.push(rows);
  }
  return out;
}

/**
 * Odd-table Web Mitchell for 8-round, 24-board sessions at 13/15/17/19 tables,
 * using duplicate board copies so the whole field is compared on the same 8
 * board sets (the point of a Web — a plain Mitchell over 8 rounds would split
 * the field across different boards and lose the comparisons).
 *
 *   - NS stationary (pair = table); EW move up 1 table per round.
 *   - Board set at table t, round r (1-based):
 *       set = ((r - 1) + ((t - r) mod T)) mod 8   (reported 1..8)
 *     This is the "rainbow" assignment: EW pair p plays sets p, p+1, ..., p+7
 *     (mod 8) across the 8 rounds — 8 DISTINCT sets, so no pair ever replays a
 *     board, while every one of the 8 sets is in play every round (each set at
 *     ceil(T/8) tables simultaneously, on that many duplicate copies).
 *   - Because every pair plays 8 distinct set NUMBERS, it can never see the
 *     same (set, copy) twice regardless of how copies are labelled; copies are
 *     assigned by band (tables 1-8 = A, 9-16 = B, 17+ = C) purely so the
 *     simultaneous plays of a set number use different physical decks.
 */
export function webMitchellOdd(tables, rounds) {
  if (tables % 2 === 0) {
    throw new Error("webMitchellOdd requires an odd table count");
  }
  const sets = rounds; // 8
  const out = [];
  for (let t = 1; t <= tables; t++) {
    const rows = [];
    for (let r = 1; r <= rounds; r++) {
      const ns = t;
      const ew = wrap(t - (r - 1), tables); // EW up 1 table/round
      const zeroBasedSet =
        (r - 1 + (((t - r) % tables) + tables) % tables) % sets;
      const set = zeroBasedSet + 1;
      const copy = ["A", "B", "C", "D"][Math.floor((t - 1) / sets)];
      rows.push([ns, ew, set, copy]);
    }
    out.push(rows);
  }
  return out;
}

/** Dispatch to the even or odd Web construction. */
export function webMitchell(tables, rounds) {
  return tables % 2 === 0
    ? webMitchellEven(tables, rounds)
    : webMitchellOdd(tables, rounds);
}

/**
 * Validation:
 *  - NS and EW distinct each round;
 *  - no NS pair meets the same opponent twice;
 *  - no pair (NS seat or EW pair) ever plays the same PHYSICAL board twice,
 *    where a physical board is identified by (board set, duplicate copy A/B).
 */
export function validateWeb(tables, rounds) {
  const m = webMitchell(tables, rounds);
  const problems = [];

  for (let r = 0; r < rounds; r++) {
    const ns = [];
    const ew = [];
    for (let t = 0; t < tables; t++) {
      ns.push(m[t][r][0]);
      ew.push(m[t][r][1]);
    }
    if (new Set(ns).size !== tables) problems.push(`round ${r + 1}: NS not distinct`);
    if (new Set(ew).size !== tables) problems.push(`round ${r + 1}: EW not distinct`);
  }

  // No NS pair repeats an opponent.
  for (let t = 1; t <= tables; t++) {
    const opps = m[t - 1].map((row) => row[1]);
    if (new Set(opps).size !== opps.length)
      problems.push(`table ${t}: NS repeats an opponent`);
  }

  // Follow each EW pair; ensure distinct physical boards.
  const seatOf = {};
  for (let p = 1; p <= tables; p++) seatOf[p] = [];
  for (let r = 0; r < rounds; r++)
    for (let t = 0; t < tables; t++) seatOf[m[t][r][1]][r] = t + 1;
  for (let p = 1; p <= tables; p++) {
    const seen = new Set();
    for (let r = 0; r < rounds; r++) {
      const t = seatOf[p][r];
      const [, , set, copy] = m[t - 1][r];
      const id = `${set}${copy}`;
      if (seen.has(id)) problems.push(`EW pair ${p} replays board ${id}`);
      seen.add(id);
    }
  }

  // Each NS seat also plays distinct physical boards.
  for (let t = 1; t <= tables; t++) {
    const ids = m[t - 1].map((row) => `${row[2]}${row[3]}`);
    if (new Set(ids).size !== ids.length)
      problems.push(`table ${t}: NS seat replays a board`);
  }

  return [...new Set(problems)];
}

/** Produce a PSMovements.txt block (CRLF-joined string, no trailing newline). */
export function webBlock(tables, rounds, boardsPerSet = 3) {
  const m = webMitchell(tables, rounds);
  const totalBoards = rounds * boardsPerSet;
  const header = `1,${tables},${totalBoards},${boardsPerSet},${rounds},0`;
  const name = `[WEB${rounds}] ${tables} Table Web Mitchell (${rounds} rounds)`;
  // The persisted spec stores [ns, ew, boardSet] triples; the A/B duplicate
  // copy is a physical-logistics detail (both copies are the same board
  // numbers) and is dropped here.
  const lines = m.map((rows) =>
    rows.map(([ns, ew, set]) => `${ns},${ew},${set}`).join(","),
  );
  return [name, header, ...lines].join("\r\n");
}

// Odd-table Web gaps from recommendations.json: 8-round at 13/15/17/19 and
// 9-round at 19. (Even-table Web movements 14/16/18/20 8-round and 18 9-round
// are already seeded; do not regenerate them here.)
const TARGETS = [
  [13, 8],
  [15, 8],
  [17, 8],
  [19, 8],
  [19, 9],
];

const blocks = [];
for (const [tables, rounds] of TARGETS) {
  const problems = validateWeb(tables, rounds);
  if (problems.length) {
    console.error(`INVALID ${tables}t/${rounds}r:`, problems.join("; "));
    process.exit(1);
  }
  blocks.push(webBlock(tables, rounds));
  console.log(`OK ${tables}t/${rounds}r`);
}

if (process.argv.includes("--write")) {
  const p = "src/movement/PSMovements.txt";
  let s = fs.readFileSync(p, "latin1").replace(/[\r\n]+$/, "");
  s = s + "\r\n\r\n" + blocks.join("\r\n\r\n") + "\r\n";
  fs.writeFileSync(p, s, "latin1");
  console.log(`Appended ${blocks.length} Web blocks to ${p}`);
} else {
  console.log("\n(dry run; pass --write to append)");
}
