import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Server, Socket } from "socket.io";

vi.mock("./draw-next-round.handler", () => ({
  registerDrawNextRoundHandler: vi.fn(),
}));
vi.mock("./draw-next-teams-round.handler", () => ({
  registerDrawNextTeamsRoundHandler: vi.fn(),
}));

import { registerDrawNextRoundHandler } from "./draw-next-round.handler";
import { registerDrawNextTeamsRoundHandler } from "./draw-next-teams-round.handler";
import { registerSwissHandlers } from "./swiss.handlers";

describe("registerSwissHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires both the Swiss Pairs and Swiss Teams draw handlers", () => {
    const socket = {} as Socket;
    const io = {} as Server;

    registerSwissHandlers(socket, io);

    expect(registerDrawNextRoundHandler).toHaveBeenCalledWith(socket, io);
    expect(registerDrawNextTeamsRoundHandler).toHaveBeenCalledWith(socket, io);
  });
});
