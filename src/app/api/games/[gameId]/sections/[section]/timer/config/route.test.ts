import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/update-timer-state", () => ({
  updateTimerState: vi.fn(),
}));
vi.mock("@/socket/broadcast/timer-broadcast", () => ({
  broadcastTimerConfigSaved: vi.fn(),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { updateTimerState } from "@/db/games/actions/update-timer-state";
import { broadcastTimerConfigSaved } from "@/socket/broadcast/timer-broadcast";
import { PUT } from "./route";

const validBody = {
  boardsPerRound: 2,
  totalRounds: 4,
  playDuration: 420,
  moveDuration: 60,
};

function invoke(
  gameId: string,
  section: string,
  body: unknown,
  token: string | null = "tok",
) {
  const req = new Request(
    `http://localhost/api/games/${gameId}/sections/${section}/timer/config`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-director-token": token } : {}),
      },
      body: JSON.stringify(body),
    },
  );
  return PUT(req, { params: Promise.resolve({ gameId }) } as never);
}

describe("PUT /api/games/[gameId]/sections/[section]/timer/config", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  it("persists a configured timer state and broadcasts timer:sync", async () => {
    const res = await invoke("g1", "A", validBody);

    expect(res.status).toBe(200);
    expect(updateTimerState).toHaveBeenCalledWith(
      "g1",
      "A",
      expect.objectContaining({
        phase: null,
        isRunning: false,
        totalRounds: 4,
        playDuration: 420,
      }),
    );
    expect(broadcastTimerConfigSaved).toHaveBeenCalledWith(
      "g1",
      "A",
      expect.objectContaining({ isRunning: false }),
    );
  });

  it("passes breaks and warningSeconds through to the state", async () => {
    await invoke("g1", "B", {
      ...validBody,
      warningSeconds: 30,
      breaks: [{ afterRound: 2, mode: "duration", durationSeconds: 300 }],
    });

    expect(updateTimerState).toHaveBeenCalledWith(
      "g1",
      "B",
      expect.objectContaining({
        warningSeconds: 30,
        breaks: [{ afterRound: 2, mode: "duration", durationSeconds: 300 }],
      }),
    );
  });

  it("returns 400 for an invalid body (missing fields)", async () => {
    const res = await invoke("g1", "A", { playDuration: 420 });

    expect(res.status).toBe(400);
    expect(updateTimerState).not.toHaveBeenCalled();
    expect(broadcastTimerConfigSaved).not.toHaveBeenCalled();
  });

  it("returns 400 for non-positive durations", async () => {
    const res = await invoke("g1", "A", { ...validBody, playDuration: 0 });
    expect(res.status).toBe(400);
    expect(updateTimerState).not.toHaveBeenCalled();
  });

  it("returns 401 without a valid director token", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", "A", validBody, null);
    expect(res.status).toBe(401);
    expect(updateTimerState).not.toHaveBeenCalled();
  });

  it("returns 404 when the game does not exist", async () => {
    vi.mocked(getDb).mockResolvedValue(null as never);
    const res = await invoke("ghost", "A", validBody);
    expect(res.status).toBe(404);
  });

  it("returns 500 when updateTimerState throws", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(updateTimerState).mockRejectedValue(new Error("DB error"));

    const res = await invoke("g1", "A", validBody);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toMatchObject({
      error: "Internal server error",
    });
    expect(broadcastTimerConfigSaved).not.toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
