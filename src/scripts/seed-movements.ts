import {
  createPairMovementRoundSpec,
  createTeamMovementRoundSpec,
} from "@/db/movements/actions/create-movement-round-spec";
import {
  createPairMovementSpec,
  createTeamMovementSpec,
} from "@/db/movements/actions/create-movement-spec";
import {
  createPairMovementTableSpec,
  createTeamMovementTableSpec,
} from "@/db/movements/actions/create-movement-table-spec";
import { generatePairsMovements } from "@/movement/pairsMovements";
import { boardSetFor, Movement } from "@/movement/shared";
import { generateTeamsMovements } from "@/movement/teamsMovements";

async function main() {
  try {
    await seedMovements();
    console.log("✅ Seed complete!");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();

async function seedMovements() {
  await seedPairMovements(generatePairsMovements());

  console.log("✅ Pairs movements seeded!");

  await seedTeamMovements(generateTeamsMovements());

  console.log("✅ Teams movements seeded!");
}

async function seedPairMovements(movements: Movement<"PAIR">[]) {
  for (const movement of movements) {
    // 1️⃣ Insert movement
    const movementId = await createPairMovementSpec({
      name: movement.name,
      type: movement.type.toString(),
      tables: movement.tables,
      boards: movement.boards,
      boardsPerRound: movement.boardsPerRound,
      rounds: movement.rounds,
      missingPair: movement.missingParticipant ?? null,
    });

    // 2️⃣ Insert tables
    for (const table of movement.tableData) {
      const tableId = await createPairMovementTableSpec({
        movementId,
        tableNumber: table.table,
      });

      // 3️⃣ Insert rounds
      for (const round of table.rounds) {
        const idx = table.rounds.indexOf(round);
        await createPairMovementRoundSpec({
          tableId,
          roundNumber: idx + 1,
          ns: round.participants.nsId,
          ew: round.participants.ewId,
          boardSet: boardSetFor(round.boards[0], movement.boardsPerRound),
        });
      }
    }
  }
}

async function seedTeamMovements(movements: Movement<"PAIR">[]) {
  for (const movement of movements) {
    // 1️⃣ Insert movement
    const movementId = await createTeamMovementSpec({
      name: movement.name,
      type: movement.type.toString(),
      tables: movement.tables,
      boards: movement.boards,
      boardsPerRound: movement.boardsPerRound,
      rounds: movement.rounds,
    });

    // 2️⃣ Insert tables
    for (const table of movement.tableData) {
      const tableId = await createTeamMovementTableSpec({
        movementId,
        tableNumber: table.table,
      });

      // 3️⃣ Insert rounds
      for (const round of table.rounds) {
        const idx = table.rounds.indexOf(round);
        await createTeamMovementRoundSpec({
          tableId,
          roundNumber: idx + 1,
          ns: round.participants.nsId,
          ew: round.participants.ewId,
          boardSet: boardSetFor(round.boards[0], movement.boardsPerRound),
        });
      }
    }
  }
}
