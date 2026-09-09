import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

import { useStationaryPairs } from "./stationary-pairs";
import type { SelectedMovement } from "@/model/selected-movement";

describe("useStationaryPairs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("returns an empty map when no movement is selected", () => {
    const { result } = renderHook(() => useStationaryPairs(null, "PAIRS"));
    expect(result.current.size).toBe(0);
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("marks NS stationary (not EW) for a standard Mitchell, without fetching", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 4, rounds: 4, boardsPerRound: 2 },
    };

    const { result } = renderHook(() =>
      useStationaryPairs(selected, "PAIRS"),
    );

    // No SPEC fetch for a MITCHELL selection.
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
    // Every table has NS stationary and EW rotating in a standard Mitchell.
    expect(result.current.size).toBe(4);
    for (const dirs of result.current.values()) {
      expect(dirs.ns).toBe(true);
      expect(dirs.ew).toBe(false);
    }
  });

  it("computes stationarity from the fetched detail for a SPEC movement", () => {
    mockUseSWR.mockReturnValue({
      data: {
        type: "PAIRS",
        tables: [
          {
            tableNumber: 1,
            // NS constant across rounds, EW changes.
            rounds: [
              { ns: "1NS", ew: "1EW" },
              { ns: "1NS", ew: "2EW" },
            ],
          },
          {
            tableNumber: 2,
            // Neither constant.
            rounds: [
              { ns: "2NS", ew: "2EW" },
              { ns: "3NS", ew: "1EW" },
            ],
          },
        ],
      },
      isLoading: false,
    });

    const selected: SelectedMovement = {
      source: "SPEC",
      specId: 42,
      boardsPerRound: 2,
    };

    const { result } = renderHook(() =>
      useStationaryPairs(selected, "PAIRS"),
    );

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/movements/detail/PAIRS/42",
      expect.any(Function),
    );
    expect(result.current.get(1)).toEqual({ ns: true, ew: false });
    expect(result.current.get(2)).toEqual({ ns: false, ew: false });
  });

  it("returns an empty map while a SPEC lookup is loading", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });

    const selected: SelectedMovement = {
      source: "SPEC",
      specId: 7,
      boardsPerRound: 3,
    };

    const { result } = renderHook(() =>
      useStationaryPairs(selected, "TEAMS"),
    );

    expect(result.current.size).toBe(0);
  });
});
