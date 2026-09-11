import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/create-section", () => ({
  createSection: vi.fn(),
}));
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));
vi.mock("@/socket/broadcast/section-broadcast", () => ({
  broadcastSections: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { createSection } from "@/db/games/actions/create-section";
import { findSections } from "@/db/games/queries/find-sections";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { GET, POST } from "./route";

function invoke(gameId: string, body: unknown, token: string | null = "tok") {
  const req = new Request(`http://localhost/api/games/${gameId}/sections`, {
    method: "POST",
    headers: token ? { "x-director-token": token } : {},
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("POST /api/games/[gameId]/sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("creates a section and broadcasts, returning 200", async () => {
    const res = await invoke("g1", { section: "B", label: "Blue", tables: 3 });

    expect(res.status).toBe(200);
    expect(createSection).toHaveBeenCalledWith("g1", {
      section: "B",
      label: "Blue",
      tables: 3,
    });
    expect(broadcastSections).toHaveBeenCalledWith("g1");
  });

  it("returns 401 without a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", { section: "B", tables: 3 }, null);
    expect(res.status).toBe(401);
    expect(createSection).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid body", async () => {
    const res = await invoke("g1", { section: "B" });
    expect(res.status).toBe(400);
    expect(createSection).not.toHaveBeenCalled();
  });

  it("returns 400 with the action's message when the section is a duplicate", async () => {
    vi.mocked(createSection).mockRejectedValue(
      new Error("Section B already exists"),
    );
    const res = await invoke("g1", { section: "B", tables: 3 });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: "Section B already exists",
    });
    expect(broadcastSections).not.toHaveBeenCalled();
  });

  it("returns 404 when the game does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    const res = await invoke("ghost", { section: "B", tables: 3 });
    expect(res.status).toBe(404);
  });
});

function invokeGet(gameId: string) {
  const req = new Request(`http://localhost/api/games/${gameId}/sections`);
  return GET(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("GET /api/games/[gameId]/sections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
  });

  it("lists sections with the selected movement parsed", async () => {
    vi.mocked(findSections).mockResolvedValue([
      {
        section: "A",
        label: "A",
        tables: 4,
        ordinal: 0,
        selectedMovement: JSON.stringify({
          source: "SPEC",
          specId: 7,
          boardsPerRound: 2,
        }),
      },
      {
        section: "B",
        label: "Blue",
        tables: 3,
        ordinal: 1,
        selectedMovement: null,
      },
    ] as never);

    const res = await invokeGet("g1");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: {
        sections: [
          {
            section: "A",
            label: "A",
            tables: 4,
            ordinal: 0,
            selectedMovement: {
              source: "SPEC",
              specId: 7,
              boardsPerRound: 2,
            },
          },
          {
            section: "B",
            label: "Blue",
            tables: 3,
            ordinal: 1,
            selectedMovement: null,
          },
        ],
      },
    });
  });

  it("is not director-gated (readable without a director token)", async () => {
    vi.mocked(findSections).mockResolvedValue([] as never);
    const res = await invokeGet("g1");
    expect(res.status).toBe(200);
    expect(validateDirectorToken).not.toHaveBeenCalled();
  });

  it("returns 404 when the game does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    const res = await invokeGet("ghost");
    expect(res.status).toBe(404);
    expect(findSections).not.toHaveBeenCalled();
  });
});
