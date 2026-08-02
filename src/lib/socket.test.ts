import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock socket.io-client before importing the module under test
const mockEmit = vi.fn();
const mockSocket = {
  emit: mockEmit,
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

import { getSocket, emitWithAck, emitEvent } from "./socket";

describe("socket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("getSocket", () => {
    it("returns a socket instance", () => {
      const socket = getSocket();
      expect(socket).toBe(mockSocket);
    });

    it("returns the same socket on subsequent calls", () => {
      const first = getSocket();
      const second = getSocket();
      expect(first).toBe(second);
    });
  });

  describe("emitWithAck", () => {
    it("resolves with data on successful response", async () => {
      mockEmit.mockImplementation(
        (event: string, payload: unknown, cb: (res: any) => void) => {
          cb({ success: true, data: { id: "123" } });
        },
      );

      const result = await emitWithAck<{ id: string }>("test:event", {
        foo: "bar",
      });
      expect(result).toEqual({ id: "123" });
      expect(mockEmit).toHaveBeenCalledWith(
        "test:event",
        { foo: "bar" },
        expect.any(Function),
      );
    });

    it("rejects with error message on failed response", async () => {
      mockEmit.mockImplementation(
        (event: string, payload: unknown, cb: (res: any) => void) => {
          cb({ success: false, error: "Something went wrong" });
        },
      );

      await expect(emitWithAck("test:event", { foo: "bar" })).rejects.toThrow(
        "Something went wrong",
      );
    });

    it("rejects with timeout error when no response within timeout", async () => {
      // Don't call the callback to simulate no response
      mockEmit.mockImplementation(() => {});

      const promise = emitWithAck("test:event", { foo: "bar" }, 1000);

      vi.advanceTimersByTime(1000);

      await expect(promise).rejects.toThrow("Timeout waiting for test:event");
    });

    it("uses default 5000ms timeout when not specified", async () => {
      mockEmit.mockImplementation(() => {});

      const promise = emitWithAck("test:event");

      // At 4999ms, should still be pending
      vi.advanceTimersByTime(4999);

      // At 5000ms, should reject
      vi.advanceTimersByTime(1);

      await expect(promise).rejects.toThrow("Timeout waiting for test:event");
    });

    it("clears timeout when response arrives before timeout", async () => {
      mockEmit.mockImplementation(
        (event: string, payload: unknown, cb: (res: any) => void) => {
          // Respond immediately
          cb({ success: true, data: "result" });
        },
      );

      const result = await emitWithAck<string>("test:event", undefined, 5000);
      expect(result).toBe("result");

      // Advancing timers past the timeout should not cause issues
      vi.advanceTimersByTime(10000);
    });
  });

  describe("emitEvent", () => {
    it("emits an event with payload", () => {
      mockEmit.mockImplementation(() => {}); // emitEvent doesn't use callbacks
      emitEvent("game:join", { gameId: "g1" });
      expect(mockEmit).toHaveBeenCalledWith("game:join", { gameId: "g1" });
    });

    it("emits an event without payload", () => {
      mockEmit.mockImplementation(() => {});
      emitEvent("game:leave");
      expect(mockEmit).toHaveBeenCalledWith("game:leave", undefined);
    });
  });
});
