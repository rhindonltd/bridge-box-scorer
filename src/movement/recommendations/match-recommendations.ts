import { PairMovementSpec } from "@/db/movements/schema";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";
import { RECOMMENDED_MOVEMENTS } from "./recommended-movements-data";
import {
  MovementFamily,
  RecommendationEntry,
  RecommendedMovement,
  movementTypeToFamily,
} from "./recommendation-types";

/**
 * A client-generated Mitchell option offered by the movement chooser, tagged
 * with the family it satisfies. Boards-per-round is fixed (no user stepper).
 */
export type GeneratedMovementOption = {
  name: string;
  family: MovementFamily;
  spec: MitchellMovementSpec;
};

/**
 * A concrete candidate movement resolved from either a generated option or a
 * seeded DB spec, with the numbers needed for ordering and display.
 */
type Candidate = {
  family: MovementFamily;
  name: string;
  rounds: number;
  boardsPerRound: number;
  source: "generated" | "db";
  generated?: GeneratedMovementOption;
  db?: PairMovementSpec;
};

function generatedRounds(spec: MitchellMovementSpec): number {
  // A skip Mitchell drops the final round; otherwise rounds == spec.rounds.
  return spec.skip ? spec.rounds - 1 : spec.rounds;
}

function toCandidates(
  generatedOptions: GeneratedMovementOption[],
  dbSpecs: PairMovementSpec[],
): Candidate[] {
  const fromGenerated: Candidate[] = generatedOptions.map((option) => ({
    family: option.family,
    name: option.name,
    rounds: generatedRounds(option.spec),
    boardsPerRound: option.spec.boardsPerRound,
    source: "generated",
    generated: option,
  }));

  const fromDb: Candidate[] = dbSpecs.map((spec) => ({
    family: movementTypeToFamily(spec.type, spec.name),
    name: spec.name,
    rounds: spec.rounds,
    boardsPerRound: spec.boardsPerRound,
    source: "db",
    db: spec,
  }));

  return [...fromGenerated, ...fromDb];
}

/**
 * Choose the best candidate for an entry: prefer one whose rounds/boards
 * profile matches the entry's target exactly, otherwise fall back to the first
 * candidate of the matching family.
 */
function pickCandidate(
  entry: RecommendationEntry,
  candidates: Candidate[],
): Candidate | undefined {
  const sameFamily = candidates.filter((c) => c.family === entry.family);
  if (sameFamily.length === 0) return undefined;

  const exact = sameFamily.find((c) => {
    const roundsOk =
      entry.targetRounds === undefined || c.rounds === entry.targetRounds;
    const boardsOk =
      entry.targetBoardsPerRound === undefined ||
      c.boardsPerRound === entry.targetBoardsPerRound;
    return roundsOk && boardsOk;
  });

  return exact ?? sameFamily[0];
}

function toRecommendedMovement(
  entry: RecommendationEntry,
  candidate: Candidate,
): RecommendedMovement {
  const boardsPerPair =
    candidate.rounds * candidate.boardsPerRound ||
    entry.fallbackBoardsPerPair ||
    0;

  const base = {
    family: entry.family,
    name: candidate.name,
    rounds: candidate.rounds,
    boardsPerRound: candidate.boardsPerRound,
    boardsPerPair,
    pros: entry.pros,
    cons: entry.cons,
    note: entry.note,
  };

  if (candidate.source === "generated" && candidate.generated) {
    return {
      ...base,
      source: "generated",
      specRef: { source: "generated", spec: candidate.generated.spec },
    };
  }

  // DB source.
  const db = candidate.db!;
  return {
    ...base,
    source: "db",
    specRef: { source: "db", id: db.id, type: db.type },
  };
}

/**
 * Resolve the curated recommendations for a table count against the movements
 * actually available (client-generated Mitchell options + seeded DB specs).
 *
 * Recommendations with no matching available movement are dropped. The result
 * is ordered by boards-a-pair-plays (descending), tie-broken by the curated
 * preference rank (ascending, 1 = most recommended).
 */
export function matchRecommendations(
  tableCount: number,
  generatedOptions: GeneratedMovementOption[],
  dbSpecs: PairMovementSpec[],
): RecommendedMovement[] {
  const entries = RECOMMENDED_MOVEMENTS[tableCount];
  if (!entries) return [];

  const candidates = toCandidates(generatedOptions, dbSpecs);

  const resolved = entries
    .map((entry) => {
      const candidate = pickCandidate(entry, candidates);
      if (!candidate) return null;
      return {
        entry,
        movement: toRecommendedMovement(entry, candidate),
      };
    })
    .filter(
      (r): r is { entry: RecommendationEntry; movement: RecommendedMovement } =>
        r !== null,
    );

  resolved.sort((a, b) => {
    if (b.movement.boardsPerPair !== a.movement.boardsPerPair) {
      return b.movement.boardsPerPair - a.movement.boardsPerPair;
    }
    return a.entry.preference - b.entry.preference;
  });

  return resolved.map((r) => r.movement);
}
