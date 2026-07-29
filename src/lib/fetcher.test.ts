import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetcher } from "./fetcher";

describe("fetcher", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls fetch with the URL and returns parsed JSON", async () => {
    const mockData = { id: 1, name: "Test" };
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await fetcher("/api/test");

    expect(fetch).toHaveBeenCalledWith("/api/test");
    expect(result).toEqual(mockData);
  });

  it("throws an error when response is not ok", async () => {
    const mockResponse = {
      ok: false,
      status: 404,
      statusText: "Not Found",
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    await expect(fetcher("/api/missing")).rejects.toThrow(
      "Fetch failed: 404 Not Found",
    );
  });

  it("attaches status code to the error", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    try {
      await fetcher("/api/broken");
    } catch (err: unknown) {
      expect((err as { status: number }).status).toBe(500);
    }
  });

  it("propagates network errors", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    await expect(fetcher("/api/fail")).rejects.toThrow("Network error");
  });
});
