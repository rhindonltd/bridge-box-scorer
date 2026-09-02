// Ad-hoc analysis: which JSON recommendation entries can be matched to a
// movement the system can produce (generated Mitchell family or a seeded
// PSMovements.txt spec)? Run with: node scripts/analyze-recommendation-matches.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// ---- Parse PSMovements.txt headers into available DB movements ----
const raw = fs.readFileSync(
  path.join(root, "src/movement/PSMovements.txt"),
  "utf-8",
);
const groups = raw
  .split(/\r?\n/)
  .reduce(
    (acc, line) => {
      if (line.trim() === "") return [...acc, []];
      acc[acc.length - 1].push(line);
      return acc;
    },
    [[]],
  )
  .filter((g) => g.length >= 2);

function nameToFamily(name) {
  const l = name.toLowerCase();
  if (l.includes("rover")) return "ROVER";
  if (l.includes("appendix")) return "APPENDIX";
  if (l.includes("web")) return "WEB";
  if (l.includes("double weave") || l.includes("weave")) return "DOUBLE_WEAVE";
  if (l.includes("double hesitation")) return "DOUBLE_HESITATION";
  if (l.includes("hesitation")) return "HESITATION";
  if (l.includes("beynon")) return "BEYNON";
  if (l.includes("bowman")) return "BOWMAN";
  if (l.includes("3/4 howell")) return "THREE_QUARTER_HOWELL";
  if (l.includes("howell")) return "HOWELL";
  if (l.includes("square")) return "SQUARE";
  if (l.includes("twin")) return "TWIN";
  if (l.includes("relay")) return "RELAY";
  if (l.includes("arrow")) return "ARROW_SWITCH";
  if (l.includes("skip")) return "SKIP_MITCHELL";
  if (l.includes("switched")) return "MITCHELL";
  if (l.includes("mitchell")) return "MITCHELL";
  return "OTHER";
}

const dbMovements = groups.map((lines) => {
  const name = lines[0];
  const ints = lines[1].split(",").map((x) => parseInt(x.trim(), 10));
  const tables = ints[1];
  const boardsPerRound = ints[3];
  const rounds = ints[4];
  return { name, family: nameToFamily(name), tables, rounds, boardsPerRound };
});

// ---- Generated Mitchell options (per mitchell-options.ts logic) ----
function generatedFamily(tables, rounds) {
  if (tables % 2 !== 0) return "MITCHELL";
  if (rounds === tables) return "SHARE_AND_RELAY";
  return "SKIP_MITCHELL";
}

// ---- Map JSON movement label to acceptable families ----
function jsonLabelToFamilies(label) {
  const l = label.toLowerCase();
  if (l === "howell") return ["HOWELL", "THREE_QUARTER_HOWELL"];
  if (l === "3/4 howell") return ["THREE_QUARTER_HOWELL", "HOWELL"];
  if (l === "mitchell") return ["MITCHELL"];
  if (l === "skip mitchell") return ["SKIP_MITCHELL"];
  if (l === "relay mitchell") return ["RELAY", "SHARE_AND_RELAY"];
  if (l === "arrow switch mitchell") return ["ARROW_SWITCH", "MITCHELL"];
  if (l === "hesitation mitchell") return ["HESITATION"];
  if (l === "double weave mitchell") return ["DOUBLE_WEAVE"];
  if (l === "beynon mitchell") return ["BEYNON"];
  if (l === "web mitchell") return ["WEB"];
  if (l === "appendix mitchell") return ["APPENDIX"];
  if (l === "square mitchell") return ["SQUARE"];
  if (l === "twin mitchell") return ["TWIN"];
  if (l === "twin skip mitchell") return ["TWIN"];
  if (l === "hybrid") return ["HYBRID"];
  return ["UNKNOWN:" + label];
}

const json = JSON.parse(
  fs.readFileSync(path.join(root, "scripts/recommendations.json"), "utf-8"),
);

const unmatched = [];
let total = 0;
let matched = 0;

for (const [tablesStr, byBoards] of Object.entries(json.recommendations)) {
  const tables = Number(tablesStr);
  for (const [boardsStr, list] of Object.entries(byBoards)) {
    if (!list) continue;
    for (const rec of list) {
      total++;
      const rounds = rec.rounds;
      const bpr = Math.round(rec.boardsPerRound);
      const families = jsonLabelToFamilies(rec.movement);

      // Generated Mitchell match?
      const genFam = generatedFamily(tables, rounds);
      const generatedMatch =
        families.includes(genFam) && rounds > 1 && rounds <= tables;

      // DB match?
      const dbMatch = dbMovements.find(
        (m) =>
          m.tables === tables &&
          m.rounds === rounds &&
          m.boardsPerRound === bpr &&
          families.includes(m.family),
      );

      if (generatedMatch || dbMatch) {
        matched++;
      } else {
        // Does the system have this family at this table count at ALL
        // (any round/board profile)? If so it's a profile mismatch; if not,
        // the family is entirely unsupported.
        const familyAvailableSameTables =
          dbMovements.some(
            (m) => m.tables === tables && families.includes(m.family),
          ) ||
          (families.includes(generatedFamily(tables, rounds)) &&
            // generated Mitchell family always available at this table count
            true);
        unmatched.push({
          tables,
          boards: Number(boardsStr),
          movement: rec.movement,
          rounds,
          boardsPerRound: bpr,
          families,
          reason: familyAvailableSameTables
            ? "profile-mismatch"
            : "family-unsupported",
        });
      }
    }
  }
}

console.log(`Total non-null entries: ${total}`);
console.log(`Matched: ${matched}`);
console.log(`Unmatched: ${unmatched.length}`);
console.log("\n--- Unmatched: family entirely unsupported by the system ---");
for (const u of unmatched.filter((x) => x.reason === "family-unsupported")) {
  console.log(
    `${u.tables}t ${u.boards}b: ${u.movement} (${u.rounds}x${u.boardsPerRound})`,
  );
}

console.log(
  "\n--- Unmatched: family exists at this table count but not at requested rounds x boards ---",
);
for (const u of unmatched.filter((x) => x.reason === "profile-mismatch")) {
  console.log(
    `${u.tables}t ${u.boards}b: ${u.movement} (${u.rounds}x${u.boardsPerRound})`,
  );
}
