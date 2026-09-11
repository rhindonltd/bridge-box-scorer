import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "stored-token",
}));

import { saveTimerConfig } from "./timer-service";

const fields = {
  boardsPerRound: 2,
  totalRounds: 4,
  playDuration: 420,
  moveDuration: 60,
};

describe("saveTimerConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs the section timer config with the director-token header", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, result: {} }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await saveTimerConfig("g1", "A", fields);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/sections/A/timer/config",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "x-director-token": "stored-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(fields),
      }),
    );
  });

  it("encodes the section in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal("fetch", fetchMock);

    await saveTimerConfig("g1", "A B", fields);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/sections/A%20B/timer/config",
      expect.anything(),
    );
  });

  it("throws the server error message on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Invalid timer configuration" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveTimerConfig("g1", "A", fields)).rejects.toThrow(
      "Invalid timer configuration",
    );
  });
});
