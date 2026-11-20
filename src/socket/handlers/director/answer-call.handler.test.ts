import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocketEvents } from "@/socket/socket-events";

vi.mock("@/socket/middleware/director-auth", () => ({
  assertDirector: vi.fn(),
}));
vi.mock("@/socket/broadcast/director-calls", () => ({
  answerCall: vi.fn(),
}));

import { assertDirector } from "@/socket/middleware/director-auth";
import { answerCall } from "@/socket/broadcast/director-calls";
import { registerAnswerCallHandler } from "./answer-call.handler";
import { registerDirectorHandlers } from "./director.handlers";

async function answer(payload: Record<string, unknown> = {}) {
  const socket = { id: "s1", on: vi.fn() } as any;
  const emit = vi.fn();
  const io = { to: vi.fn(() => ({ emit })) } as any;
  registerAnswerCallHandler(socket, io);
  const handler = socket.on.mock.calls.find(
    (c: any) => c[0] === SocketEvents.DIRECTOR_ANSWER_CALL,
  )![1];
  const cb = vi.fn();
  await handler(
    { gameId: "g1", directorToken: "dt", alertId: "a1", ...payload },
    cb,
  );
  return { cb, io, emit };
}

describe("director:answerCall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertDirector).mockReturnValue(true);
  });

  it("tells the calling seat the director is on the way", async () => {
    vi.mocked(answerCall).mockReturnValue("A3NS");
    const { cb, io, emit } = await answer();
    expect(answerCall).toHaveBeenCalledWith("g1", "a1");
    expect(io.to).toHaveBeenCalledWith("game:g1:seat:A3NS");
    expect(emit).toHaveBeenCalledWith("game:directorCallAnswered", {
      gameId: "g1",
      seat: "A3NS",
    });
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { answered: true },
    });
  });

  it("does nothing more when another director already answered", async () => {
    vi.mocked(answerCall).mockReturnValue(null);
    const { cb, io } = await answer();
    expect(io.to).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { answered: false },
    });
  });

  it("refuses a device that isn't a director of the game", async () => {
    vi.mocked(assertDirector).mockImplementation((_t, _g, ack) => {
      ack?.({ success: false, error: "Unauthorized" });
      return false;
    });
    const { cb } = await answer({ directorToken: "bad" });
    expect(answerCall).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({ success: false, error: "Unauthorized" });
  });

  it("is registered with the director handlers", () => {
    const socket = { id: "s1", on: vi.fn() } as any;
    registerDirectorHandlers(socket, {} as any);
    expect(socket.on).toHaveBeenCalledWith(
      SocketEvents.DIRECTOR_ANSWER_CALL,
      expect.any(Function),
    );
  });
});
