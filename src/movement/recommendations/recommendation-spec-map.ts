import fs from "node:fs";
import path from "node:path";
import { MovementDescriptor } from "./movement-descriptor";
import { buildSpecCatalog } from "./spec-catalog";
import {
  resolveRecommendationDescriptor,
  RecommendationEntryInput,
} from "./resolve-recommendation";

/**
 * The resolved movement-spec mapping for the curated recommendations in
 * scripts/recommendations.json.
 *
 * Structure mirrors recommendations.json exactly:
 *   tables (2-20) -> boards (18-30) -> descriptor[] | null
 *
 * Each recommendation entry resolves to one or more {@link MovementDescriptor}s.
 * A single recommendation can map to more than one descriptor (e.g. an Arrow
 * Switch Mitchell on an even table count yields both a share-and-relay and a
 * skip option). A `null` boards cell means either the source JSON had no
 * recommendation there, or none of its recommendations could yet be resolved.
 *
 * The map is DERIVED from the resolver (resolve-recommendation.ts) run over the
 * seeded PSMovements.txt catalog, so it stays in lock-step with the resolution
 * rules and the seeded spec ids. A committed JSON snapshot
 * (recommendation-spec-map.json) provides an inspectable artifact; a test
 * asserts the snapshot matches the derived map.
 */
export type RecommendationSpecMap = Record<
  string,
  Record<string, MovementDescriptor[] | null>
>;

type RawEntry = {
  movement: string;
  rounds: number;
  boardsPerRound: number;
  pros?: string[];
  cons?: string[];
};

type RecommendationsJson = {
  recommendations: Record<string, Record<string, RawEntry[] | null>>;
};

/**
 * Load scripts/recommendations.json (the curated source data).
 */
export function loadRecommendationsJson(): RecommendationsJson {
  const file = path.join(process.cwd(), "scripts", "recommendations.json");
  return JSON.parse(fs.readFileSync(file, "utf-8")) as RecommendationsJson;
}

/**
 * Derive the recommendation-to-spec map by resolving every non-null entry in
 * recommendations.json against the seeded catalog. Entries whose movement is
 * not yet producible (see resolve-recommendation.ts) are dropped, so a cell may
 * resolve to a subset of its recommendations or to null.
 */
export function buildRecommendationSpecMap(): RecommendationSpecMap {
  const json = loadRecommendationsJson();
  const catalog = buildSpecCatalog();
  const map: RecommendationSpecMap = {};

  for (const [tablesStr, byBoards] of Object.entries(json.recommendations)) {
    map[tablesStr] = {};
    for (const [boardsStr, list] of Object.entries(byBoards)) {
      if (!list) {
        map[tablesStr][boardsStr] = null;
        continue;
      }

      const descriptors: MovementDescriptor[] = [];
      for (const rec of list) {
        const entry: RecommendationEntryInput = {
          tables: Number(tablesStr),
          boards: Number(boardsStr),
          movement: rec.movement,
          rounds: rec.rounds,
          boardsPerRound: Math.round(rec.boardsPerRound),
          pros: rec.pros ?? [],
          cons: rec.cons ?? [],
        };
        const result = resolveRecommendationDescriptor(entry, catalog);
        if (result.resolved) {
          descriptors.push(...result.descriptors);
        }
      }

      map[tablesStr][boardsStr] = descriptors.length > 0 ? descriptors : null;
    }
  }

  return map;
}
