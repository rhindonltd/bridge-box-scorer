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
      json: vi.fn().mockResolvedValue(mockData),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await fetcher("/api/test");

    expect(fetch).toHaveBeenCalledWith("/api/test");
    expect(result).toEqual(mockData);
  });

  it("propagates fetch errors", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

    await expect(fetcher("/api/fail")).rejects.toThrow("Network error");
  });
});
