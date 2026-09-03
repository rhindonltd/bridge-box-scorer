import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { buildSpecCatalog } from "./spec-catalog";
import {
  resolveRecommendationDescriptor,
  RecommendationEntryInput,
} from "./resolve-recommendation";
import { descriptorToSelectedMovement } from "./movement-descriptor";
import { generateMitchell } from "@/movement/mitchell/mitchell";

/**
 * Coverage harness for the recommendation-to-spec mapping.
 *
 * Iterates every non-null entry in scripts/recommendations.json, resolves it
 * through resolveRecommendationDescriptor against the seeded PSMovements.txt
 * catalog, and asserts:
 *   1. every resolved SPEC id points at a catalog row of the right family,
 *      tables and rounds (guards against seed-order drift);
 *   2. every resolved MITCHELL descriptor actually builds via generateMitchell;
 *   3. the only unresolved movements are the known deferred set.
 *
 * As the deferred generators land, move each label out of EXPECTED_GAP_LABELS.
 */

type RawEntry = {
  movement: string;
  rounds: number;
  boardsPerRound: number;
  pros?: string[];
  cons?: string[];
};

type RecommendationsJson = {
  recommendations: Record<
    string,
    Record<string, RawEntry[] | null>
  >;
};

/**
 * The recommendation entries that do NOT yet resolve, each keyed
 * `tables/boards/movement/roundsxboardsPerRound`.
 *
 * This set is now EMPTY: every non-null recommendation resolves to a concrete,
 * buildable movement. Odd-table Web Mitchells use a rover ("even Web + NS
 * rover") construction seeded from the verified bridgecentral.com grids
 * (13/15/17 tables at 8 rounds, 19 tables at 9 rounds); the 19-table 8-round
 * Web is the 9-round movement with its final round truncated.
 *
 * Excluded movements (Twin, Twin Skip, Beynon, Hybrid) are handled separately
 * via EXCLUDED_LABELS in resolve-recommendation.ts and are not gaps.
 *
 * If a future change removes a seeded spec, the offending entry will surface
 * here; add it back with a reason.
 */
const EXPECTED_GAPS = new Set<string>([]);

function gapKey(entry: RecommendationEntryInput): string {
  return `${entry.tables}/${entry.boards}/${entry.movement}/${entry.rounds}x${entry.boardsPerRound}`;
}

function loadRecommendations(): RecommendationsJson {
  const file = path.join(process.cwd(), "scripts", "recommendations.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as RecommendationsJson;
}

function* iterateEntries(
  json: RecommendationsJson,
): Generator<RecommendationEntryInput> {
  for (const [tablesStr, byBoards] of Object.entries(json.recommendations)) {
    for (const [boardsStr, list] of Object.entries(byBoards)) {
      if (!list) continue;
      for (const rec of list) {
        yield {
          tables: Number(tablesStr),
          boards: Number(boardsStr),
          movement: rec.movement,
          rounds: rec.rounds,
          boardsPerRound: Math.round(rec.boardsPerRound),
          pros: rec.pros ?? [],
          cons: rec.cons ?? [],
        };
      }
    }
  }
}

describe("recommendation coverage", () => {
  const catalog = buildSpecCatalog();
  const json = loadRecommendations();
  const entries = [...iterateEntries(json)];

  it("has recommendation entries to check", () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  it("resolves every non-null entry except the known tracked gaps", () => {
    const unexpectedGaps: string[] = [];
    const unexpectedResolved: string[] = [];

    for (const entry of entries) {
      const result = resolveRecommendationDescriptor(entry, catalog);
      const key = gapKey(entry);

      // Intentionally-excluded multi-section movements are neither gaps nor
      // resolved; skip them entirely.
      if (!result.resolved && result.excluded) {
        continue;
      }

      if (!result.resolved) {
        if (!EXPECTED_GAPS.has(key)) {
          unexpectedGaps.push(`${key}: ${result.reason}`);
        }
      } else if (EXPECTED_GAPS.has(key)) {
        // A tracked gap that now resolves — the EXPECTED_GAPS entry is stale
        // and should be removed.
        unexpectedResolved.push(key);
      }
    }

    expect(unexpectedGaps, `unexpected gaps:\n${unexpectedGaps.join("\n")}`).toEqual(
      [],
    );
    expect(
      unexpectedResolved,
      `now-resolved; remove from EXPECTED_GAPS:\n${unexpectedResolved.join("\n")}`,
    ).toEqual([]);
  });

  it("produces buildable descriptors for every resolved entry", () => {
    const failures: string[] = [];

    for (const entry of entries) {
      const result = resolveRecommendationDescriptor(entry, catalog);
      if (!result.resolved) continue;

      for (const descriptor of result.descriptors) {
        const context = `${entry.tables}t/${entry.boards}b ${entry.movement} (${entry.rounds}x${entry.boardsPerRound})`;

        if (descriptor.type === "SPEC") {
          // The (name, tables, rounds) triple must identify exactly one seeded
          // spec (names are unique within a table count + round count).
          const rows = catalog.filter(
            (c) =>
              c.name === descriptor.name &&
              c.tables === entry.tables &&
              c.rounds === entry.rounds,
          );
          if (rows.length === 0) {
            failures.push(
              `${context}: no seeded spec named "${descriptor.name}" at ${entry.tables}t/${entry.rounds}r`,
            );
          } else if (rows.length > 1) {
            failures.push(
              `${context}: spec name "${descriptor.name}" is ambiguous at ${entry.tables}t/${entry.rounds}r (${rows.length} matches)`,
            );
          }
          continue;
        }

        // MITCHELL: convert to the persisted spec and build it.
        const selected = descriptorToSelectedMovement(descriptor);
        if (selected.source !== "MITCHELL") {
          failures.push(`${context}: expected MITCHELL selection`);
          continue;
        }
        try {
          const built = generateMitchell(selected.mitchell);
          if (built.tables.length !== entry.tables) {
            failures.push(
              `${context}: built ${built.tables.length} tables, expected ${entry.tables}`,
            );
          }
        } catch (err) {
          failures.push(`${context}: generate threw: ${(err as Error).message}`);
        }
      }
    }

    expect(failures, failures.join("\n")).toEqual([]);
  });
});
