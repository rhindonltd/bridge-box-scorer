import { describe, it, expect, vi } from "vitest";

import { ClientError, respondToActionError } from "./client-error";

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
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cause = new Error("db exploded");

    const res = respondToActionError(cause, "evict failed");

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      success: false,
      error: "Internal server error",
    });
    expect(errSpy).toHaveBeenCalledWith("evict failed", cause);
    errSpy.mockRestore();
  });
});
