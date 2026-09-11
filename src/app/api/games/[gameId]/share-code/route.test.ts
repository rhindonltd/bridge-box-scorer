import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/system/actions/create-share-code", () => ({
  createShareCode: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { createShareCode } from "@/db/system/actions/create-share-code";
import { POST } from "./route";

function invoke(gameId: string, token: string | null = "tok") {
  const req = new Request(
    `http://localhost/api/games/${gameId}/share-code`,
    {
      method: "POST",
      headers: token ? { "x-director-token": token } : {},
    },
  );
  return POST(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("POST /api/games/[gameId]/share-code", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("mints a code for an authorized director", async () => {
    vi.mocked(createShareCode).mockResolvedValue("K7M2PX");

    const res = await invoke("g1");

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      success: true,
      result: { code: "K7M2PX" },
    });
    expect(createShareCode).toHaveBeenCalledWith("g1");
  });

  it("returns 401 without a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", null);
    expect(res.status).toBe(401);
    expect(createShareCode).not.toHaveBeenCalled();
  });

  it("returns 404 when the game does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    const res = await invoke("ghost");
    expect(res.status).toBe(404);
    expect(createShareCode).not.toHaveBeenCalled();
  });

  it("returns 500 when createShareCode throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createShareCode).mockRejectedValue(new Error("DB error"));

    const res = await invoke("g1");

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Internal server error",
    });
    errSpy.mockRestore();
  });
});
