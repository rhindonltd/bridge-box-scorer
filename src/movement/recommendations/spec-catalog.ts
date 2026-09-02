import { generatePairsMovements } from "@/movement/pairsMovements";
import { movementTypeToFamily } from "./recommendation-types";
import { SpecCatalogEntry } from "./resolve-recommendation";

/**
 * Build the seeded pair-movement catalog from PSMovements.txt in the exact
 * order the seeder inserts it, assigning each block the database id it will
 * receive on a fresh seed (1-based, matching the auto-increment primary key —
 * see createPairMovementSpec's use of lastInsertRowid and seed-movements.ts,
 * which iterates generatePairsMovements() in file order).
 *
 * This lets the recommendation resolver produce concrete SPEC ids without a
 * live database. The coverage harness cross-checks each id against this same
 * catalog so any drift between the assumed and actual ordering is caught.
 */
export function buildSpecCatalog(): SpecCatalogEntry[] {
  return generatePairsMovements().map((movement, index) => ({
    id: index + 1,
    name: movement.name,
    family: movementTypeToFamily(movement.type.toString(), movement.name),
    tables: movement.tables,
    rounds: movement.rounds,
  }));
}
