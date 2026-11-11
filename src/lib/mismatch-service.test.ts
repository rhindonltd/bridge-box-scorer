import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: vi.fn(() => "tok"),
}));

import { getDirectorToken } from "@/lib/director-token";
import { fetchMismatchCandidates } from "./mismatch-service";

describe("fetchMismatchCandidates", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("GETs with the director token and returns the candidates", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { candidates: [{ id: 1 }] } }),
    });
    const out = await fetchMismatchCandidates("g1", "A B");
    expect(out).toEqual([{ id: 1 }]);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/mismatch-candidates?section=A%20B",
      { method: "GET", headers: { "x-director-token": "tok" } },
    );
  });

  it("sends an empty token when none is held", async () => {
    vi.mocked(getDirectorToken).mockReturnValueOnce(null as any);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ result: { candidates: [] } }),
    });
    await fetchMismatchCandidates("g1", "A");
    expect(fetchMock.mock.calls[0][1].headers["x-director-token"]).toBe("");
  });

  it("throws the server error message", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => ({ error: "nope" }),
    });
    await expect(fetchMismatchCandidates("g1", "A")).rejects.toThrow("nope");
  });

  it("falls back to a default message when the body is unreadable", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("bad json");
      },
    });
    await expect(fetchMismatchCandidates("g1", "A")).rejects.toThrow(
      "Failed to load mismatch candidates",
    );
  });
});
