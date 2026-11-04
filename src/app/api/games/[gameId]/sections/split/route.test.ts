import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/actions/split-section", () => ({
  splitSection: vi.fn(),
}));
vi.mock("@/db/games/queries/is-game-started", () => ({
  isGameStarted: vi.fn(),
}));
vi.mock("@/socket/broadcast/section-broadcast", () => ({
  broadcastSections: vi.fn(),
}));
vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));
vi.mock("@/db/games/actions/clear-timer-state", () => ({
  clearTimerState: vi.fn(),
}));
vi.mock("@/timer/game-store", () => ({
  clearEngine: vi.fn(),
}));
vi.mock("@/socket/handlers/timer/broadcast-timer", () => ({
  broadcastTimerCleared: vi.fn(),
}));
const mockEmit = vi.fn();
const mockTo = vi.fn(() => ({ emit: mockEmit }));
vi.mock("@/socket/websocket", () => ({
  getIO: vi.fn(() => ({ to: mockTo })),
}));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { splitSection } from "@/db/games/actions/split-section";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { broadcastSections } from "@/socket/broadcast/section-broadcast";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { clearTimerState } from "@/db/games/actions/clear-timer-state";
import { clearEngine } from "@/timer/game-store";
import { broadcastTimerCleared } from "@/socket/handlers/timer/broadcast-timer";
import { Rooms } from "@/socket/rooms";
import { SocketEvents } from "@/socket/socket-events";
import { POST } from "./route";

function invoke(gameId: string, body: unknown) {
  const req = new Request(`http://localhost/api/games/${gameId}/sections/split`, {
    method: "POST",
    headers: { "x-director-token": "tok", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(req, { params: Promise.resolve({ gameId }) } as never);
}

const validBody = {
  from: "A",
  newSection: "B",
  tablesToNewSection: 2,
  newLabel: "Spill",
  fromLabel: "Main",
};

describe("POST /api/games/[gameId]/sections/split", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({ marker: "db" } as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
    vi.mocked(isGameStarted).mockResolvedValue(false);
    vi.mocked(splitSection).mockResolvedValue([
      { from: "A5NS", to: "B1NS" },
      { from: "A5EW", to: "B1EW" },
    ]);
  });

  it("splits a section, broadcasts sections + participants, and notifies moved seats", async () => {
    const res = await invoke("g1", validBody);
    expect(res.status).toBe(200);
    expect(splitSection).toHaveBeenCalledWith("g1", validBody);
    expect(broadcastSections).toHaveBeenCalledWith("g1");
    expect(broadcastParticipants).toHaveBeenCalledWith("g1");

    // The seat moves are pushed to the game room so each affected device can
    // re-route itself to its new seat.
    expect(mockTo).toHaveBeenCalledWith(Rooms.game("g1"));
    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.SEAT_RENUMBERED, {
      gameId: "g1",
      moves: [
        { from: "A5NS", to: "B1NS" },
        { from: "A5EW", to: "B1EW" },
      ],
    });
  });

  it("clears the timer for BOTH affected sections (their movements were cleared)", async () => {
    const res = await invoke("g1", validBody);
    expect(res.status).toBe(200);

    for (const section of ["A", "B"]) {
      expect(clearTimerState).toHaveBeenCalledWith("g1", section);
      expect(clearEngine).toHaveBeenCalledWith("g1", section);
      expect(broadcastTimerCleared).toHaveBeenCalledWith(
        { to: mockTo },
        "g1",
        section,
      );
    }
  });

  it("does not emit SEAT_RENUMBERED when no seats moved", async () => {
    vi.mocked(splitSection).mockResolvedValueOnce([]);

    const res = await invoke("g1", validBody);
    expect(res.status).toBe(200);
    expect(broadcastParticipants).toHaveBeenCalledWith("g1");
    expect(mockEmit).not.toHaveBeenCalled();
    // Timer clears still run (the movements were cleared regardless of seating).
    expect(clearTimerState).toHaveBeenCalledWith("g1", "A");
    expect(clearTimerState).toHaveBeenCalledWith("g1", "B");
  });

  it("blocks splitting once the game has started", async () => {
    vi.mocked(isGameStarted).mockResolvedValue(true);

    const res = await invoke("g1", validBody);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already started/i);
    expect(splitSection).not.toHaveBeenCalled();
    expect(broadcastSections).not.toHaveBeenCalled();
    expect(clearTimerState).not.toHaveBeenCalled();
  });

  it("surfaces a client error from the action as a 400", async () => {
    const { ClientError } = await import("@/lib/api/client-error");
    vi.mocked(splitSection).mockRejectedValueOnce(
      new ClientError("Section B already exists"),
    );

    const res = await invoke("g1", validBody);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/already exists/);
  });

  it("rejects a malformed body with 400", async () => {
    const res = await invoke("g1", { from: "A" });
    expect(res.status).toBe(400);
    expect(splitSection).not.toHaveBeenCalled();
  });

  it("returns 401 when the director token is invalid", async () => {
    vi.mocked(validateDirectorToken).mockReturnValue(false);
    const res = await invoke("g1", validBody);
    expect(res.status).toBe(401);
    expect(isGameStarted).not.toHaveBeenCalled();
    expect(splitSection).not.toHaveBeenCalled();
  });
});
