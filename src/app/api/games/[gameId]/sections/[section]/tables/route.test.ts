import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/update-section-tables", () => ({
  updateSectionTables: vi.fn(),
}));
vi.mock("@/db/games/queries/find-sections", () => ({
  findSections: vi.fn(),
}));
vi.mock("@/socket/broadcast/section-broadcast", () => ({
  broadcastSections: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { updateSectionTables } from "@/db/games/actions/update-section-tables";
import { findSections } from "@/db/games/queries/find-sections";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { PUT } from "./route";

function invoke(
  gameId: string,
  section: string,
  body: unknown,
  token: string | null = "tok",
) {
  const req = new Request(
    `http://localhost/api/games/${gameId}/sections/${section}/tables`,
    {
      method: "PUT",
      headers: token ? { "x-director-token": token } : {},
      body: JSON.stringify(body),
    },
  );
  return PUT(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("PUT /api/games/[gameId]/sections/[section]/tables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(findSections).mockResolvedValue([
      { section: "A", label: "A", tables: 4, ordinal: 0, selectedMovement: null },
    ] as never);
  });

  it("resizes the section and broadcasts", async () => {
    const res = await invoke("g1", "A", { tables: 6 });

    expect(res.status).toBe(200);
    expect(updateSectionTables).toHaveBeenCalledWith("g1", "A", 6);
    expect(broadcastSections).toHaveBeenCalledWith("g1");
  });

  it("returns 404 when the section does not exist", async () => {
    const res = await invoke("g1", "Z", { tables: 6 });
    expect(res.status).toBe(404);
    expect(updateSectionTables).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid table count", async () => {
    const res = await invoke("g1", "A", { tables: 0 });
    expect(res.status).toBe(400);
    expect(updateSectionTables).not.toHaveBeenCalled();
  });

  it("returns 401 without a valid token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", "A", { tables: 6 }, null);
    expect(res.status).toBe(401);
  });

  it("returns 400 with the shrink-guard message on failure", async () => {
    vi.mocked(updateSectionTables).mockRejectedValue(
      new Error("Cannot remove a table with seated participants"),
    );
    const res = await invoke("g1", "A", { tables: 1 });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Cannot remove a table with seated participants",
    });
  });
});
