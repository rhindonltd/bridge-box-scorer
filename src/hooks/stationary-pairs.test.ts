import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

import { useMovementResolution } from "./stationary-pairs";
import type { SelectedMovement } from "@/model/selected-movement";

describe("useMovementResolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("returns empty maps when no movement is selected", () => {
    const { result } = renderHook(() =>
      useMovementResolution(null, "PAIRS", 4),
    );
    expect(result.current.stationary.size).toBe(0);
    expect(result.current.placement.size).toBe(0);
    expect(result.current.movementTables).toBe(0);
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("marks NS stationary (not EW) for a standard Mitchell, without fetching", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 4, rounds: 4, boardsPerRound: 2 },
    };

    const { result } = renderHook(() =>
      useMovementResolution(selected, "PAIRS", 4),
    );

    // No SPEC fetch for a MITCHELL selection.
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
    // Every table has NS stationary and EW rotating in a standard Mitchell.
    expect(result.current.stationary.size).toBe(4);
    for (const dirs of result.current.stationary.values()) {
      expect(dirs.ns).toBe(true);
      expect(dirs.ew).toBe(false);
    }
  });

  it("resolves per-table placement for a standard Mitchell", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 4, rounds: 4, boardsPerRound: 2 },
    };

    const { result } = renderHook(() =>
      useMovementResolution(selected, "PAIRS", 4),
    );

    expect(result.current.movementTables).toBe(4);
    expect(result.current.placement.get(1)).toMatchObject({
      boardStart: 1,
      boardEnd: 2,
    });
    // No copies, shares, or relay in a plain Mitchell.
    for (const p of result.current.placement.values()) {
      expect(p.boardCopy).toBeUndefined();
      expect(p.sharesWith).toBeUndefined();
      expect(p.relayWith).toBeUndefined();
    }
  });

  it("annotates share and relay for a Share-and-Relay Mitchell", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: {
        tables: 6,
        rounds: 6,
        boardsPerRound: 2,
        shareAndRelay: true,
      },
    };

    const { result } = renderHook(() =>
      useMovementResolution(selected, "PAIRS", 6),
    );

    // Tables 1 and 6 share the first board set; relay sits between 3 and 4.
    expect(result.current.placement.get(1)?.sharesWith).toEqual([6]);
    expect(result.current.placement.get(6)?.sharesWith).toEqual([1]);
    expect(result.current.placement.get(3)?.relayWith).toBe(4);
    expect(result.current.placement.get(4)?.relayWith).toBe(3);
  });

  it("empties both maps when the section table count does not match", () => {
    const selected: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 4, rounds: 4, boardsPerRound: 2 },
    };

    // Section resized to 3 tables while the movement expects 4.
    const { result } = renderHook(() =>
      useMovementResolution(selected, "PAIRS", 3),
    );

    expect(result.current.stationary.size).toBe(0);
    expect(result.current.placement.size).toBe(0);
    // The movement's own size is still reported for callers to explain.
    expect(result.current.movementTables).toBe(4);
  });

  it("computes stationarity and placement from the fetched detail for a SPEC movement", () => {
    mockUseSWR.mockReturnValue({
      data: {
        type: "PAIRS",
        tables: [
          {
            tableNumber: 1,
            // NS constant across rounds, EW changes.
            rounds: [
              { roundNumber: 1, ns: "1NS", ew: "1EW", boardStart: 1, boardEnd: 2 },
              { roundNumber: 2, ns: "1NS", ew: "2EW", boardStart: 3, boardEnd: 4 },
            ],
          },
          {
            tableNumber: 2,
            // Neither constant.
            rounds: [
              { roundNumber: 1, ns: "2NS", ew: "2EW", boardStart: 3, boardEnd: 4 },
              { roundNumber: 2, ns: "3NS", ew: "1EW", boardStart: 5, boardEnd: 6 },
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
      useMovementResolution(selected, "PAIRS", 2),
    );

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/movements/detail/PAIRS/42",
      expect.any(Function),
    );
    expect(result.current.stationary.get(1)).toEqual({ ns: true, ew: false });
    expect(result.current.stationary.get(2)).toEqual({ ns: false, ew: false });
    // Round-1 placement is taken from the fetched board ranges.
    expect(result.current.placement.get(1)).toMatchObject({
      boardStart: 1,
      boardEnd: 2,
    });
    expect(result.current.placement.get(2)).toMatchObject({
      boardStart: 3,
      boardEnd: 4,
    });
    // Seeded specs never carry a relay.
    for (const p of result.current.placement.values()) {
      expect(p.relayWith).toBeUndefined();
    }
  });

  it("returns empty maps while a SPEC lookup is loading", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });

    const selected: SelectedMovement = {
      source: "SPEC",
      specId: 7,
      boardsPerRound: 3,
    };

    const { result } = renderHook(() =>
      useMovementResolution(selected, "TEAMS", 5),
    );

    expect(result.current.stationary.size).toBe(0);
    expect(result.current.placement.size).toBe(0);
  });
});
