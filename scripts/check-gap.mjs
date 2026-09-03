// Quick gap-resolution checker for a single (tables, rounds, family) probe.
// Usage: npx tsx --require ./scripts/allow-server-only.cjs scripts/check-gap.mjs
import { buildSpecCatalog } from "../src/movement/recommendations/spec-catalog.ts";
import { generatePairsMovements } from "../src/movement/pairsMovements.ts";

const catalog = buildSpecCatalog();
const probe = process.argv[2] || "HOWELL";
const t = Number(process.argv[3] || 2);
const r = Number(process.argv[4] || 6);
const rows = catalog.filter((c) => c.family === probe && c.tables === t && c.rounds === r);
console.log(`${probe} ${t}t/${r}r catalog rows:`, JSON.stringify(rows));

// Confirm the parsed movement is structurally sound (table + round counts).
const m = generatePairsMovements();
rows.forEach((row) => {
  const mv = m[row.id - 1];
  console.log(
    `  id ${row.id}: "${mv.name}" tables=${mv.tableData.length} rounds/table=${mv.tableData[0].rounds.length}`,
  );
});
