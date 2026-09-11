import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: vi.fn(() => "director-tok"),
}));

import {
  createSection,
  renameSection,
  deleteSection,
  updateSectionTables,
  setSectionMovementSpec,
  setSectionMitchellMovement,
} from "./section-service";

const okResponse = { ok: true, json: async () => ({ success: true, result: {} }) };

describe("section-service (HTTP)", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn().mockResolvedValue(okResponse);
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function lastCall() {
    const [url, init] = fetchMock.mock.calls[0];
    return { url, init, body: init.body ? JSON.parse(init.body) : undefined };
  }

  it("createSection POSTs to /sections with the header and body", async () => {
    await createSection("g1", "A", 8, "North");
    const { url, init, body } = lastCall();
    expect(url).toBe("/api/games/g1/sections");
    expect(init.method).toBe("POST");
    expect(init.headers["x-director-token"]).toBe("director-tok");
    expect(body).toEqual({ section: "A", label: "North", tables: 8 });
  });

  it("renameSection PATCHes /sections/[section]", async () => {
    await renameSection("g1", "A", "Red Room");
    const { url, init, body } = lastCall();
    expect(url).toBe("/api/games/g1/sections/A");
    expect(init.method).toBe("PATCH");
    expect(body).toEqual({ label: "Red Room" });
  });

  it("deleteSection DELETEs /sections/[section] with no body", async () => {
    await deleteSection("g1", "B");
    const { url, init } = lastCall();
    expect(url).toBe("/api/games/g1/sections/B");
    expect(init.method).toBe("DELETE");
    expect(init.body).toBeUndefined();
  });

  it("updateSectionTables PUTs /sections/[section]/tables", async () => {
    await updateSectionTables("g1", "A", 12);
    const { url, init, body } = lastCall();
    expect(url).toBe("/api/games/g1/sections/A/tables");
    expect(init.method).toBe("PUT");
    expect(body).toEqual({ tables: 12 });
  });

  it("setSectionMovementSpec PUTs /sections/[section]/movement with id + boardsPerRound", async () => {
    await setSectionMovementSpec("g1", "A", 42, 2);
    const { url, init, body } = lastCall();
    expect(url).toBe("/api/games/g1/sections/A/movement");
    expect(init.method).toBe("PUT");
    expect(body).toEqual({ id: 42, boardsPerRound: 2 });
  });

  it("setSectionMitchellMovement PUTs /sections/[section]/movement with the mitchell spec", async () => {
    const mitchell = { tables: 8, rounds: 8, boardsPerRound: 2 };
    await setSectionMitchellMovement("g1", "A", mitchell);
    const { body } = lastCall();
    expect(body).toEqual({ mitchell });
  });

  it("throws the server error message on a non-ok response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Section A already exists" }),
    });

    await expect(createSection("g1", "A", 8)).rejects.toThrow(
      "Section A already exists",
    );
  });
});
