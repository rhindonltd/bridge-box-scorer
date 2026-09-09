import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

import { useMovementRoundInfo } from "./movement-round-info";
import type { SelectedMovement } from "@/model/selected-movement";

describe("useMovementRoundInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no fetched data (used by the MITCHELL/null cases that never fetch).
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("returns null when no movement is selected without fetching", () => {
    const { result } = renderHook(() => useMovementRoundInfo(null, "PAIRS"));

    expect(result.current).toEqual({ info: null, isLoading: false });
    // SWR is called with a null key (disabled) so no request is made.
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("resolves MITCHELL selections inline without fetching", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 4, rounds: 7, boardsPerRound: 3 },
    };

    const { result } = renderHook(() =>
      useMovementRoundInfo(selected, "PAIRS"),
    );

    expect(result.current).toEqual({
      info: { rounds: 7, boardsPerRound: 3 },
      isLoading: false,
    });
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("fetches SPEC detail and derives rounds from the first table", () => {
    mockUseSWR.mockReturnValue({
      data: {
        type: "PAIRS",
        tables: [
          { tableNumber: 1, rounds: [{}, {}, {}, {}, {}, {}] },
          { tableNumber: 2, rounds: [{}, {}, {}, {}, {}, {}] },
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
      useMovementRoundInfo(selected, "PAIRS"),
    );

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/movements/detail/PAIRS/42",
      expect.any(Function),
    );
    expect(result.current).toEqual({
      info: { rounds: 6, boardsPerRound: 2 },
      isLoading: false,
    });
  });

  it("returns null info while a SPEC lookup is loading", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });

    const selected: SelectedMovement = {
      source: "SPEC",
      specId: 7,
      boardsPerRound: 3,
    };

    const { result } = renderHook(() =>
      useMovementRoundInfo(selected, "TEAMS"),
    );

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/movements/detail/TEAMS/7",
      expect.any(Function),
    );
    expect(result.current).toEqual({ info: null, isLoading: true });
  });
});
