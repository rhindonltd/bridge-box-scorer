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
 * `tables/boards/movement/roundsxboardsPerRound`. The only remaining gaps are
 * ODD-table Web Mitchells (13/15/17/19 at 8 rounds, plus 19 at 9 rounds).
 *
 * These are deferred, not skipped: a Web Mitchell is only replay-free when the
 * room splits into equal duplicate-board zones, which needs an EVEN table
 * count (see gen-web-mitchell.mjs, which validates by following each pair and
 * requires distinct physical boards). Several published "odd-table Web"
 * constructions were evaluated and every one made East-West pairs replay the
 * same physical boards for multiple consecutive rounds (they trade board
 * freshness for a simple move), so none passed validation. A genuinely
 * replay-free odd-table layout (e.g. a verified EBUScore/ACBLscore export) can
 * be seeded via the generator once available.
 *
 * Excluded movements (Twin, Twin Skip, Beynon, Hybrid) are NOT listed here:
 * they are intentionally out of scope (see EXCLUDED_LABELS in
 * resolve-recommendation.ts).
 *
 * As each gap is closed (a spec is seeded at the needed tables/rounds), remove
 * its line here. When this set is empty the mapping is complete.
 */
const EXPECTED_GAPS = new Set<string>([
  "13/24/Web Mitchell/8x3",
  "15/24/Web Mitchell/8x3",
  "17/24/Web Mitchell/8x3",
  "19/24/Web Mitchell/8x3",
  "19/27/Web Mitchell/9x3",
]);

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
