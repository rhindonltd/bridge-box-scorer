import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games/queries/get-deal", () => ({
  getAllDealHands: vi.fn(),
}));

import { getAllDealHands } from "@/db/games/queries/get-deal";
import { generatePbnExport } from "./pbn-service";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Club } from "@/db/system/schema";
import type { Deal } from "@/model/common";

const game = {
  eventName: "Monday Pairs",
  eventDate: "2026-09-17",
} as BridgeGame;

const club = { name: "Riverside BC" } as Club;

function deal(): Deal {
  return { N: ["SA"], E: ["SK"], S: ["SQ"], W: ["SJ"] };
}

describe("generatePbnExport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes the game's event name/date, the club name (as Site), and the deals to the PBN generator", async () => {
    vi.mocked(getAllDealHands).mockResolvedValue(new Map([[1, deal()]]));

    const out = await generatePbnExport({} as never, game, club);

    expect(out).toContain('[Event "Monday Pairs"]');
    expect(out).toContain('[Site "Riverside BC"]');
    expect(out).toContain('[Date "2026.09.17"]');
    expect(out).toContain('[Board "1"]');
  });

  it("returns an empty document when no board has an entered deal", async () => {
    vi.mocked(getAllDealHands).mockResolvedValue(new Map());

    await expect(generatePbnExport({} as never, game, club)).resolves.toBe("");
  });
});
