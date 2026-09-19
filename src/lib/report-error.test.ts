import { describe, it, expect, vi, afterEach } from "vitest";
import { reportError } from "./report-error";

describe("reportError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("alerts with an Error's message", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    reportError(new Error("boom"));
    expect(alertSpy).toHaveBeenCalledWith("boom");
  });

  it("alerts a generic message for a non-Error throw", () => {
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    reportError("just a string");
    expect(alertSpy).toHaveBeenCalledWith("Something went wrong");
  });
});
