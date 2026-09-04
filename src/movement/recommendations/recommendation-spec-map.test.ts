import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildRecommendationSpecMap,
  loadRecommendationsJson,
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
    // Tables 2-20 all now have at least one resolvable recommendation (table 19
    // via the 9-round rover Web).
    for (let t = 2; t <= 20; t++) {
      expect(snapshot[String(t)]).toBeDefined();
    }
  });
});

describe("buildRecommendationSpecMap with synthetic source data", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Intercept only the recommendations.json read so the real spec catalog
   * (PSMovements.txt) still loads normally, and feed a synthetic set of
   * recommendations that exercises the null-cell and no-resolvable-cell
   * branches.
   */
  function mockRecommendations(
    json: Parameters<typeof JSON.stringify>[0],
  ): void {
    const real = fs.readFileSync;
    vi.spyOn(fs, "readFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      ...rest: unknown[]
    ) => {
      if (typeof file === "string" && file.endsWith("recommendations.json")) {
        return JSON.stringify(json);
      }
      // Delegate every other read (e.g. the movement catalog) to the real fn.
      return (real as (...args: unknown[]) => unknown)(file, ...rest);
    }) as typeof fs.readFileSync);
  }

  it("skips null board cells and omits tables with no resolvable movement", () => {
    // Table "3": one null cell (skipped) plus one cell whose only movement is
    // unresolvable ("NotAMovement"), so no descriptors resolve. The whole
    // table is therefore omitted from the map.
    mockRecommendations({
      recommendations: {
        "3": {
          "20": null,
          "24": [
            {
              movement: "NotAMovement",
              rounds: 3,
              boardsPerRound: 2,
            },
          ],
        },
      },
    });

    const map = buildRecommendationSpecMap();

    // The null cell was skipped and the unresolvable cell produced no
    // descriptors, so table 3 is not present at all.
    expect(map["3"]).toBeUndefined();
    expect(Object.keys(map)).toHaveLength(0);
  });

  it("still loads the real recommendations file via loadRecommendationsJson", () => {
    const json = loadRecommendationsJson();
    expect(json.recommendations).toBeDefined();
  });
});
