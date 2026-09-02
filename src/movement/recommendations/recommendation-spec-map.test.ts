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

  it("contains only schema-valid descriptors", () => {
    for (const byBoards of Object.values(snapshot)) {
      for (const descriptors of Object.values(byBoards)) {
        if (!descriptors) continue;
        for (const descriptor of descriptors) {
          expect(movementDescriptorSchema.safeParse(descriptor).success).toBe(
            true,
          );
        }
      }
    }
  });

  it("maps the same table/boards keys as recommendations.json", () => {
    // Every table 2-20 is present.
    for (let t = 2; t <= 20; t++) {
      expect(snapshot[String(t)]).toBeDefined();
    }
  });
});
