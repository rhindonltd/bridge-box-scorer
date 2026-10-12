import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

// ---- mocks ----

vi.mock("@/db/games/queries/expected-late-seats", () => ({
  addExpectedLateSeat: vi.fn(),
  removeExpectedLateSeat: vi.fn(),
}));

vi.mock("@/socket/middleware/director-auth", () => ({
  assertDirector: vi.fn(),
}));

vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));

vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));

vi.mock("@/db/games", () => ({
  getDb: vi.fn(),
}));

import {
  addExpectedLateSeat,
  removeExpectedLateSeat,
} from "@/db/games/queries/expected-late-seats";
import { assertDirector } from "@/socket/middleware/director-auth";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { getDb } from "@/db/games";
import { registerSetSeatExpectedLateHandler } from "./set-seat-expected-late";

function makeSocket() {
  return { data: {}, id: "s", on: vi.fn() };
}
function makeIo() {
  return { to: vi.fn(() => ({ emit: vi.fn() })) };
}

function handlerFor() {
  const socket = makeSocket();
  registerSetSeatExpectedLateHandler(socket as any, makeIo() as any);
  const [event, fn] = socket.on.mock.calls[0];
  return { event, fn };
}

describe("registerSetSeatExpectedLateHandler (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as any);
    vi.mocked(assertDirector).mockReturnValue(true);
  });

  it("registers on the SET_SEAT_EXPECTED_LATE event", () => {
    const { event } = handlerFor();
    expect(event).toBe(SocketEvents.SET_SEAT_EXPECTED_LATE);
  });

  it("marks a seat expected-late and fans out", async () => {
    const { fn } = handlerFor();
    const cb = vi.fn();

    await fn(
      { gameId: "g1", directorToken: "tok", seat: "A3EW", expectedLate: true },
      cb,
    );

    expect(addExpectedLateSeat).toHaveBeenCalledWith({}, "A3EW");
    expect(removeExpectedLateSeat).not.toHaveBeenCalled();
    expect(broadcastParticipants).toHaveBeenCalled();
    expect(broadcastLeaderboardChanged).toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: true, data: null });
  });

  it("clears a seat's expected-late mark when expectedLate is false", async () => {
    const { fn } = handlerFor();
    const cb = vi.fn();

    await fn(
      { gameId: "g1", directorToken: "tok", seat: "A3EW", expectedLate: false },
      cb,
    );

    expect(removeExpectedLateSeat).toHaveBeenCalledWith({}, "A3EW");
    expect(addExpectedLateSeat).not.toHaveBeenCalled();
  });

  it("rejects an invalid seat", async () => {
    const { fn } = handlerFor();
    const cb = vi.fn();

    await fn(
      { gameId: "g1", directorToken: "tok", seat: "nonsense", expectedLate: true },
      cb,
    );

    expect(addExpectedLateSeat).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ success: false }),
    );
  });

  it("rejects when the director token is not valid", async () => {
    vi.mocked(assertDirector).mockReturnValue(false);
    const { fn } = handlerFor();
    const cb = vi.fn();

    await fn(
      { gameId: "g1", directorToken: "bad", seat: "A3EW", expectedLate: true },
      cb,
    );

    expect(addExpectedLateSeat).not.toHaveBeenCalled();
    expect(broadcastParticipants).not.toHaveBeenCalled();
  });
});
