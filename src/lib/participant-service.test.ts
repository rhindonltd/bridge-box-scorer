import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: vi.fn(() => "dir-tok"),
}));

import { getDirectorToken } from "@/lib/director-token";
import { evictParticipant } from "./participant-service";
import type { Seat } from "@/model/participants";

describe("evictParticipant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("DELETEs the seat with the director token header (seat url-encoded)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await evictParticipant("g1", "A1NS" as Seat);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/participants/A1NS",
      expect.objectContaining({
        method: "DELETE",
        headers: { "x-director-token": "dir-tok" },
      }),
    );
  });

  it("sends an empty token header when no director token is stored", async () => {
    vi.mocked(getDirectorToken).mockReturnValueOnce(null);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await evictParticipant("g1", "A1NS" as Seat);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { "x-director-token": "" } }),
    );
  });

  it("throws the server error message when the request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Cannot evict a seated pair" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(evictParticipant("g1", "A1NS" as Seat)).rejects.toThrow(
      "Cannot evict a seated pair",
    );
  });

  it("throws a default message when the error body cannot be parsed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("not json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(evictParticipant("g1", "A1NS" as Seat)).rejects.toThrow(
      "Failed to evict participant",
    );
  });
});
