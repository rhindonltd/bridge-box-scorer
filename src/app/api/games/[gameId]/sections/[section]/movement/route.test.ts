import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/set-section-movement", () => ({
  setSectionMovement: vi.fn(),
}));
vi.mock("@/db/games/queries/get-section-movement", () => ({
  getSectionMovement: vi.fn(),
}));
vi.mock("@/socket/broadcast/section-broadcast", () => ({
  broadcastSectionMovementChanged: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { setSectionMovement } from "@/db/games/actions/set-section-movement";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { broadcastSectionMovementChanged } from "@/socket/broadcast/section-broadcast";
import { PUT } from "./route";

function invoke(
  gameId: string,
  section: string,
  body: unknown,
  token: string | null = "tok",
) {
  const req = new Request(
    `http://localhost/api/games/${gameId}/sections/${section}/movement`,
    {
      method: "PUT",
      headers: token ? { "x-director-token": token } : {},
      body: JSON.stringify(body),
    },
  );
  return PUT(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("PUT /api/games/[gameId]/sections/[section]/movement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(getSectionMovement).mockResolvedValue(null);
  });

  it("sets a MITCHELL movement and broadcasts the change", async () => {
    const mitchell = { tables: 3, rounds: 3, boardsPerRound: 2 };
    const res = await invoke("g1", "A", { mitchell });

    expect(res.status).toBe(200);
    expect(setSectionMovement).toHaveBeenCalledWith("g1", "A", {
      source: "MITCHELL",
      mitchell,
    });
    expect(broadcastSectionMovementChanged).toHaveBeenCalledWith(
      "g1",
      "A",
      null,
      { source: "MITCHELL", mitchell },
    );
  });

  it("sets a SPEC movement with id + boardsPerRound", async () => {
    const res = await invoke("g1", "A", { id: 12, boardsPerRound: 2 });

    expect(res.status).toBe(200);
    expect(setSectionMovement).toHaveBeenCalledWith("g1", "A", {
      source: "SPEC",
      specId: 12,
      boardsPerRound: 2,
    });
  });

  it("clears the movement when the body is empty", async () => {
    const res = await invoke("g1", "A", {});
    expect(res.status).toBe(200);
    expect(setSectionMovement).toHaveBeenCalledWith("g1", "A", null);
  });

  it("returns 400 for a SPEC id with no boardsPerRound", async () => {
    const res = await invoke("g1", "A", { id: 12 });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "No boards per round specified",
    });
    expect(setSectionMovement).not.toHaveBeenCalled();
  });

  it("returns 401 without a valid token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", "A", { mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 } }, null);
    expect(res.status).toBe(401);
    expect(setSectionMovement).not.toHaveBeenCalled();
  });

  it("returns 400 with the action's message on failure", async () => {
    vi.mocked(setSectionMovement).mockRejectedValue(new Error("Invalid movement"));
    const res = await invoke("g1", "A", {
      mitchell: { tables: 3, rounds: 3, boardsPerRound: 2 },
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: "Invalid movement" });
  });
});
