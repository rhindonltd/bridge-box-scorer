import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const raw = fs.readFileSync(path.join(root, "src/movement/PSMovements.txt"), "utf-8");
const groups = raw.split(/\r?\n/).reduce((acc, line) => {
  if (line.trim() === "") return [...acc, []];
  acc[acc.length - 1].push(line);
  return acc;
}, [[]]).filter((g) => g.length >= 2);

const parsed = groups.map((lines) => {
  const ints = lines[1].split(",").map((x) => parseInt(x.trim(), 10));
  return { name: lines[0], type: ints[0], tables: ints[1], boardsPerRound: ints[3], rounds: ints[4] };
});

const want = process.argv[2] ? process.argv[2].toLowerCase() : null;
for (const m of parsed) {
  if (want && !m.name.toLowerCase().includes(want)) continue;
  console.log(`${m.tables}t rounds=${m.rounds} bpr=${m.boardsPerRound} type=${m.type}  ${m.name}`);
}
