import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: vi.fn(() => "dir-tok"),
}));

import { getDirectorToken } from "@/lib/director-token";
import { saveTimerConfig, type TimerConfigFields } from "./timer-service";

const fields: TimerConfigFields = {
  boardsPerRound: 2,
  totalRounds: 9,
  playDuration: 15,
  moveDuration: 1,
};

describe("saveTimerConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("PUTs the config with the director token header (section url-encoded)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await saveTimerConfig("g1", "N S", fields);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/sections/N%20S/timer/config",
      expect.objectContaining({
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-director-token": "dir-tok",
        },
        body: JSON.stringify(fields),
      }),
    );
  });

  it("sends an empty token header when no director token is stored", async () => {
    vi.mocked(getDirectorToken).mockReturnValueOnce(null);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await saveTimerConfig("g1", "A", fields);

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ "x-director-token": "" }),
      }),
    );
  });

  it("throws the server error message when the request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Timer already running" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(saveTimerConfig("g1", "A", fields)).rejects.toThrow(
      "Timer already running",
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

    await expect(saveTimerConfig("g1", "A", fields)).rejects.toThrow(
      "Failed to save timer config",
    );
  });
});
