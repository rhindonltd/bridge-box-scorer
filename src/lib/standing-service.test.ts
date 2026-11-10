import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: vi.fn(() => "tok"),
}));
vi.mock("@/lib/socket", () => ({
  emitWithAck: vi.fn().mockResolvedValue(undefined),
}));

import { emitWithAck } from "@/lib/socket";
import { SocketEvents } from "@/socket/socket-events";
import {
  setParticipantStanding,
  setSeatExpectedLate,
} from "./standing-service";

describe("standing-service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("emits the standing change with the director token", async () => {
    await setParticipantStanding("g1", "A1NS", { standing: "ACTIVE" });
    expect(emitWithAck).toHaveBeenCalledWith(
      SocketEvents.SET_PARTICIPANT_STANDING,
      {
        gameId: "g1",
        directorToken: "tok",
        seat: "A1NS",
        change: { standing: "ACTIVE" },
      },
    );
  });

  it("emits the expected-late flag with the director token", async () => {
    await setSeatExpectedLate("g1", "A1NS", true);
    expect(emitWithAck).toHaveBeenCalledWith(
      SocketEvents.SET_SEAT_EXPECTED_LATE,
      { gameId: "g1", directorToken: "tok", seat: "A1NS", expectedLate: true },
    );
  });
});
