import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildRecommendationSpecMap,
  RecommendationSpecMap,
} from "./recommendation-spec-map";
import { movementDescriptorSchema } from "./movement-descriptor";

function loadSnapshot(): RecommendationSpecMap {
  const file = path.join(
    process.cwd(),
    "src",
    "movement",
    "recommendations",
    "recommendation-spec-map.json",
  );
  return JSON.parse(fs.readFileSync(file, "utf-8")) as RecommendationSpecMap;
}

describe("RECOMMENDATION_SPEC_MAP snapshot", () => {
  const derived = buildRecommendationSpecMap();
  const snapshot = loadSnapshot();

  it("matches the freshly-derived map (regenerate the JSON if this fails)", () => {
    expect(snapshot).toEqual(derived);
  });

  it("contains only schema-valid descriptors and no empty cells", () => {
    for (const byBoards of Object.values(snapshot)) {
      for (const descriptors of Object.values(byBoards)) {
        // Empty / null cells are omitted from the snapshot entirely.
        expect(Array.isArray(descriptors) && descriptors.length > 0).toBe(true);
        for (const descriptor of descriptors) {
          expect(movementDescriptorSchema.safeParse(descriptor).success).toBe(
            true,
          );
        }
      }
    }
  });

  it("includes every table count that has at least one resolvable movement", () => {
    // Tables 2-18 and 20 each have resolvable recommendations. Table 19 has
    // only the (deferred) odd-table Web entries, so it is legitimately absent.
    for (const t of [
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 20,
    ]) {
      expect(snapshot[String(t)]).toBeDefined();
    }
    expect(snapshot["19"]).toBeUndefined();
  });
});
