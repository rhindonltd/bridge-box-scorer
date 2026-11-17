import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { SWRConfig } from "swr";
import type { ReactNode } from "react";

const handlers: Record<string, () => void> = {};
vi.mock("@/hooks/socket-event", () => ({
  useSocketEvent: (event: string, handler: () => void) => {
    handlers[event] = handler;
  },
}));
const mockFetcher = vi.fn();
vi.mock("@/lib/fetcher", () => ({
  fetcher: (...a: unknown[]) => mockFetcher(...a),
}));

import { useFinaliseCheck } from "./finalise-check";

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe("useFinaliseCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the check result", async () => {
    mockFetcher.mockResolvedValue({
      canFinalise: false,
      problems: [{ code: "RESULTS_OUTSTANDING", message: "x" }],
    });
    const { result } = renderHook(() => useFinaliseCheck("g1"), { wrapper });
    await waitFor(() => expect(result.current.canFinalise).toBe(false));
    await waitFor(() => expect(result.current.problems).toHaveLength(1));
    expect(mockFetcher).toHaveBeenCalledWith("/api/games/g1/finalise-check");
  });

  it("defaults to cannot-finalise while loading", () => {
    mockFetcher.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFinaliseCheck("g1"), { wrapper });
    expect(result.current.canFinalise).toBe(false);
    expect(result.current.problems).toEqual([]);
  });

  it("listens for game, board and reconnect events", async () => {
    mockFetcher.mockResolvedValue({ canFinalise: true, problems: [] });
    const { result } = renderHook(() => useFinaliseCheck("g1"), { wrapper });
    await waitFor(() => expect(result.current.canFinalise).toBe(true));
    expect(Object.keys(handlers)).toEqual(
      expect.arrayContaining([
        "game:updated",
        "game:boardConfirmed",
        "game:boardResultUpdated",
        "connect",
      ]),
    );
  });
});
