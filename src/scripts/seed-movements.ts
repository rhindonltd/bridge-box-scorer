import { generatePairsMovements } from "@/movement/pairsMovements";
import { createMovementSpec } from "@/db/actions/create-movement-spec";
import { createMovementTableSpec } from "@/db/actions/create-movement-table-spec";
import { createMovementRoundSpec } from "@/db/actions/create-movement-round-spec";
import { Movement } from "@/movement/shared";
import { generateTeamsMovements } from "@/movement/teamsMovements";

async function main() {
  try {
    await seedPairs();
    console.log("✅ Seed complete!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

async function seedPairs() {
  seedPairMovements(generatePairsMovements());

  console.log("✅ Pairs movements seeded!");

  seedPairMovements(generateTeamsMovements());

  console.log("✅ Teams movements seeded!");
}

async function seedPairMovements(movements: Movement<'PAIR'>[]) {
  for (const movement of movements) {
    // 1️⃣ Insert movement
    const movementId = await createMovementSpec({
      name: movement.name,
      type: movement.type.toString(),
      tables: movement.tables,
      boards: movement.boards,
      boardsPerRound: movement.boardsPerRound,
      rounds: movement.rounds,
      missingPair: movement.missingPair ?? null,
    });

    // 2️⃣ Insert tables
    for (const table of movement.tableData) {
      const tableId = await createMovementTableSpec({
        movementId,
        tableNumber: table.table,
      });

      // 3️⃣ Insert rounds
      for (const round of table.rounds) {
          const idx = table.rounds.indexOf(round);
        await createMovementRoundSpec({
          tableId,
          roundNumber: idx + 1,
          ns: round.participants.nsId,
          ew: round.participants.ewId,
          boardStart: round.boards[0],
          boardEnd: round.boards[round.boards.length - 1],
        });
      }
    }
  }

  console.log("✅ Pairs movements seeded!");
}
