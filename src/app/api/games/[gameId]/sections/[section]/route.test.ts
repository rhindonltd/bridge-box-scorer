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
vi.mock("@/lib/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
  childLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { renameSection } from "@/db/games/actions/rename-section";
import { deleteSection } from "@/db/games/actions/delete-section";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { ClientError } from "@/lib/api/client-error";
import { logger } from "@/lib/log";
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

const params = (gameId: string, section = "A") =>
  ({ params: Promise.resolve({ gameId, section }) }) as never;

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

  it("returns 400 with the reason on a precondition failure (ClientError)", async () => {
    vi.mocked(renameSection).mockRejectedValue(
      new ClientError("Section A does not exist"),
    );
    const res = await PATCH(
      req("PATCH", "g1", "A", { label: "Room A" }),
      params("g1"),
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Section A does not exist",
    });
  });

  it("returns 500 (generic, logged) on an internal failure", async () => {
    const errSpy = vi.mocked(logger.error);
    vi.mocked(renameSection).mockRejectedValue(new Error("db exploded"));
    const res = await PATCH(
      req("PATCH", "g1", "A", { label: "Room A" }),
      params("g1"),
    );
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Internal server error",
    });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockClear();
  });
});

describe("DELETE /api/games/[gameId]/sections/[section]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("deletes the section and broadcasts", async () => {
    const res = await DELETE(req("DELETE", "g1", "B"), params("g1", "B"));

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

  it("returns 400 with the reason on a precondition failure (ClientError)", async () => {
    vi.mocked(deleteSection).mockRejectedValue(
      new ClientError("Cannot delete section A: it has seated participants."),
    );
    const res = await DELETE(req("DELETE", "g1", "A"), params("g1"));
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "Cannot delete section A: it has seated participants.",
    });
  });

  it("returns 500 (generic, logged) on an internal failure", async () => {
    const errSpy = vi.mocked(logger.error);
    vi.mocked(deleteSection).mockRejectedValue(new Error("db exploded"));
    const res = await DELETE(req("DELETE", "g1", "A"), params("g1"));
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Internal server error",
    });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockClear();
  });
});
