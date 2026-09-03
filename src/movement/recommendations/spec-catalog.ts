import { generatePairsMovements } from "@/movement/pairsMovements";
import { movementTypeToFamily } from "./recommendation-types";
import { SpecCatalogEntry } from "./resolve-recommendation";

/**
 * Build the seeded pair-movement catalog from PSMovements.txt.
 *
 * Each entry is identified by its (name, tables, rounds) triple — the resolver
 * matches recommendations to seeded specs on those fields, never on a numeric
 * id. The database primary key is intentionally absent: it is a file-order
 * artifact of a fresh seed, and coupling recommendations to it made reordering
 * or removing blocks silently corrupt the mapping. The live DB id is recovered
 * by name at selection time (see spec-map-recommendations.ts).
 */
export function buildSpecCatalog(): SpecCatalogEntry[] {
  return generatePairsMovements().map((movement) => ({
    name: movement.name,
    family: movementTypeToFamily(movement.type.toString(), movement.name),
    tables: movement.tables,
    rounds: movement.rounds,
  }));
}
