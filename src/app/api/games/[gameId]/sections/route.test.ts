import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/create-section", () => ({
  createSection: vi.fn(),
}));
vi.mock("@/socket/broadcast/section-broadcast", () => ({
  broadcastSections: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { createSection } from "@/db/games/actions/create-section";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { POST } from "./route";

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
