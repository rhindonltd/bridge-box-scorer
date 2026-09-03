// Regenerate the committed recommendation-spec-map.json snapshot from the
// resolver. Run: npx tsx --require ./scripts/allow-server-only.cjs scripts/regen-spec-map.mjs
import fs from "node:fs";
import { buildRecommendationSpecMap } from "../src/movement/recommendations/recommendation-spec-map.ts";

const map = buildRecommendationSpecMap();
fs.writeFileSync(
  "src/movement/recommendations/recommendation-spec-map.json",
  JSON.stringify(map, null, 2) + "\n",
);

const total = Object.values(map)
  .flatMap((byBoards) => Object.values(byBoards))
  .filter(Boolean)
  .reduce((acc, d) => acc + d.length, 0);
console.log("Regenerated snapshot; total descriptors:", total);
