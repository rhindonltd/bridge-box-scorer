import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/rename-section", () => ({
  renameSection: vi.fn(),
}));
vi.mock("@/db/games/actions/delete-section", () => ({
  deleteSection: vi.fn(),
}));
vi.mock("@/socket/broadcast/section-broadcast", () => ({
  broadcastSections: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { renameSection } from "@/db/games/actions/rename-section";
import { deleteSection } from "@/db/games/actions/delete-section";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { PATCH, DELETE } from "./route";

function req(
  method: string,
  gameId: string,
  section: string,
  body?: unknown,
  token: string | null = "tok",
) {
  return new Request(
    `http://localhost/api/games/${gameId}/sections/${section}`,
    {
      method,
      headers: token ? { "x-director-token": token } : {},
      body: body === undefined ? undefined : JSON.stringify(body),
    },
  );
}

const params = (gameId: string) =>
  ({ params: Promise.resolve({ gameId }) }) as never;

describe("PATCH /api/games/[gameId]/sections/[section]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("renames the section and broadcasts", async () => {
    const res = await PATCH(
      req("PATCH", "g1", "A", { label: "Room A" }),
      params("g1"),
    );

    expect(res.status).toBe(200);
    expect(renameSection).toHaveBeenCalledWith("g1", "A", "Room A");
    expect(broadcastSections).toHaveBeenCalledWith("g1");
  });

  it("returns 401 without a valid token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await PATCH(
      req("PATCH", "g1", "A", { label: "Room A" }, null),
      params("g1"),
    );
    expect(res.status).toBe(401);
    expect(renameSection).not.toHaveBeenCalled();
  });

  it("returns 400 for a missing label", async () => {
    const res = await PATCH(req("PATCH", "g1", "A", {}), params("g1"));
    expect(res.status).toBe(400);
    expect(renameSection).not.toHaveBeenCalled();
  });

  it("returns 400 with the action's message on failure", async () => {
    vi.mocked(renameSection).mockRejectedValue(new Error("Section not found"));
    const res = await PATCH(
      req("PATCH", "g1", "A", { label: "Room A" }),
      params("g1"),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Section not found",
    });
  });
});

describe("DELETE /api/games/[gameId]/sections/[section]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("deletes the section and broadcasts", async () => {
    const res = await DELETE(req("DELETE", "g1", "B"), params("g1"));

    expect(res.status).toBe(200);
    expect(deleteSection).toHaveBeenCalledWith("g1", "B");
    expect(broadcastSections).toHaveBeenCalledWith("g1");
  });

  it("returns 401 without a valid token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await DELETE(req("DELETE", "g1", "B", undefined, null), params("g1"));
    expect(res.status).toBe(401);
    expect(deleteSection).not.toHaveBeenCalled();
  });

  it("returns 400 with the action's message (e.g. last section)", async () => {
    vi.mocked(deleteSection).mockRejectedValue(
      new Error("Cannot delete the last section"),
    );
    const res = await DELETE(req("DELETE", "g1", "A"), params("g1"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Cannot delete the last section",
    });
  });
});
