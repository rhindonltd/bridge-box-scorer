import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";

// The wrapper mints a per-event child logger. Capture a single shared mock
// logger (via vi.hoisted so it exists before the hoisted vi.mock factory runs)
// so tests can assert on its warn/error calls.
const mockLog = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}));
vi.mock("@/lib/log", () => ({
  logger: mockLog,
  childLogger: () => mockLog,
}));

import {
  registerHandler,
  HandlerError,
  type HandlerContext,
} from "./handler-wrapper";

function makeSocket() {
  return { id: "test", on: vi.fn() } as any;
}

function makeIo() {
  return {} as any;
}

/** Register a handler and return the raw `socket.on` listener for invocation. */
function listenerFor<TPayload, TData>(
  definition: Parameters<typeof registerHandler<TPayload, TData>>[3],
  event = "test:event",
) {
  const socket = makeSocket();
  registerHandler(socket, makeIo(), event, definition);
  return socket.on.mock.calls[0][1] as (payload: unknown, cb?: any) => Promise<void>;
}

describe("registerHandler", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registers the listener on the given event", () => {
    const socket = makeSocket();
    registerHandler(socket, makeIo(), "test:event", {
      handler: async () => {},
    });
    expect(socket.on).toHaveBeenCalledWith(
      "test:event",
      expect.any(Function),
    );
  });

  it("passes the validated payload to the handler and acks success", async () => {
    const schema = z.object({ name: z.string() });
    const handler = vi.fn(
      async (ctx: HandlerContext<{ name: string }, { greeting: string }>) => {
        ctx.ack({ success: true, data: { greeting: `hi ${ctx.payload.name}` } });
      },
    );
    const listener = listenerFor({ schema, handler });
    const cb = vi.fn();

    await listener({ name: "ann" }, cb);

    expect(handler.mock.calls[0][0].payload).toEqual({ name: "ann" });
    expect(cb).toHaveBeenCalledWith({
      success: true,
      data: { greeting: "hi ann" },
    });
  });

  it("rejects an invalid payload without running the handler", async () => {
    const schema = z.object({ name: z.string() });
    const handler = vi.fn(async () => {});
    const listener = listenerFor({ schema, handler });
    const cb = vi.fn();

    await listener({ name: 123 }, cb);

    expect(handler).not.toHaveBeenCalled();
    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "Invalid request",
    });
    expect(mockLog.warn).toHaveBeenCalled();
  });

  it("acks a HandlerError with its user-facing message", async () => {
    const listener = listenerFor({
      handler: async ({ ack }) => {
        void ack;
        throw new HandlerError("You cannot do that");
      },
    });
    const cb = vi.fn();

    await listener({}, cb);

    expect(cb).toHaveBeenCalledWith({
      success: false,
      error: "You cannot do that",
    });
  });

  it("acks a generic error and logs when the handler throws unexpectedly", async () => {
    const listener = listenerFor({
      handler: async () => {
        throw new Error("db exploded");
      },
    });
    const cb = vi.fn();

    await listener({}, cb);

    expect(cb).toHaveBeenCalledWith({ success: false, error: "Internal error" });
    expect(mockLog.error).toHaveBeenCalled();
  });

  it("acks at most once even if the handler acks then throws downstream", async () => {
    const listener = listenerFor({
      handler: async ({ ack }) => {
        ack({ success: true, data: undefined });
        // Downstream side-effect fails AFTER the success ack.
        throw new Error("broadcast blew up");
      },
    });
    const cb = vi.fn();

    await listener({}, cb);

    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith({ success: true, data: undefined });
    expect(mockLog.error).toHaveBeenCalled();
  });

  it("tolerates a missing callback (fire-and-forget caller)", async () => {
    const listener = listenerFor({
      handler: async ({ ack }) => ack({ success: true, data: undefined }),
    });

    // No cb passed — must not throw.
    await expect(listener({})).resolves.toBeUndefined();
  });
});
