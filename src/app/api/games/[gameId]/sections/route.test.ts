import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/db/games/queries/find-sections", () => ({ findSections: vi.fn() }));

import { getDb } from "@/db/games";
import { findSections } from "@/db/games/queries/find-sections";
import * as appHandler from "./route";

describe("GET /api/games/[gameId]/sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
  });

  it("lists sections with parsed selected movement", async () => {
    vi.mocked(findSections).mockResolvedValue([
      {
        section: "A",
        label: "A",
        tables: 8,
        ordinal: 0,
        selectedMovement: JSON.stringify({
          source: "MITCHELL",
          mitchell: { tables: 8, rounds: 8, boardsPerRound: 2 },
        }),
      },
      {
        section: "B",
        label: "North",
        tables: 6,
        ordinal: 1,
        selectedMovement: null,
      },
    ] as never);

    await testApiHandler({
      appHandler,
      params: { gameId: "g1" },
      test: async ({ fetch }) => {
        const res = await fetch({ method: "GET" });
        const body = await res.json();
        expect(body.success).toBe(true);
        expect(body.result.sections[0]).toMatchObject({
          section: "A",
          selectedMovement: {
            source: "MITCHELL",
            mitchell: { tables: 8, rounds: 8, boardsPerRound: 2 },
          },
        });
        expect(body.result.sections[1].selectedMovement).toBeNull();
      },
    });
  });
});
