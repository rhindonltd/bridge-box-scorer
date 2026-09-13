import { describe, it, expect, vi } from "vitest";

// Capture what respondToActionError logs on the 500 path without emitting real
// pino output during the test run.
vi.mock("@/lib/log", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { ClientError, respondToActionError } from "./client-error";
import { logger } from "@/lib/log";

describe("respondToActionError", () => {
  it("maps a ClientError to a 400 with its message", async () => {
    const res = respondToActionError(
      new ClientError("Seat is not part of this game"),
      "ctx",
    );
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Seat is not part of this game",
    });
  });

  it("maps any other error to a logged 500 with a generic message", async () => {
    const cause = new Error("db exploded");

    const res = respondToActionError(cause, "evict failed");

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Internal server error",
    });
    // The full error + context is logged server-side (structured), never
    // returned to the client.
    expect(logger.error).toHaveBeenCalledWith(
      { err: cause, context: "evict failed" },
      "Unhandled action error",
    );
  });
});
