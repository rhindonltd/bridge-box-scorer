// Print a coverage report of the recommendation-to-spec mapping.
// Run: npx tsx --require ./scripts/allow-server-only.cjs scripts/coverage-report.mjs
import fs from "node:fs";
import { buildSpecCatalog } from "../src/movement/recommendations/spec-catalog.ts";
import { resolveRecommendationDescriptor } from "../src/movement/recommendations/resolve-recommendation.ts";

const j = JSON.parse(fs.readFileSync("scripts/recommendations.json", "utf8"));
const catalog = buildSpecCatalog();
let total = 0,
  resolved = 0,
  excluded = 0;
const gaps = [];
for (const [t, byB] of Object.entries(j.recommendations)) {
  for (const [b, list] of Object.entries(byB)) {
    if (!list) continue;
    for (const r of list) {
      total++;
      const entry = {
        tables: +t,
        boards: +b,
        movement: r.movement,
        rounds: r.rounds,
        boardsPerRound: Math.round(r.boardsPerRound),
        pros: r.pros || [],
        cons: r.cons || [],
      };
      const res = resolveRecommendationDescriptor(entry, catalog);
      if (res.resolved) resolved++;
      else if (res.excluded) excluded++;
      else gaps.push(`${t}t/${b}b ${r.movement} ${r.rounds}x${Math.round(r.boardsPerRound)}: ${res.reason}`);
    }
  }
}
console.log(`Total non-null entries: ${total}`);
console.log(`Resolved:  ${resolved}`);
console.log(`Excluded:  ${excluded} (out of scope: Twin, Twin Skip, Beynon, Hybrid)`);
console.log(`Gaps:      ${gaps.length}`);
if (gaps.length) {
  console.log("\n--- Remaining gaps (missing seeded spec at these tables/rounds) ---");
  for (const g of gaps) console.log("  " + g);
}
