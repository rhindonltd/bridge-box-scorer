import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

import { useMovementRoundInfo } from "./movement-round-info";
import type { SelectedMovement } from "@/model/selected-movement";

describe("useMovementRoundInfo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
  });

  it("returns null with no movement selected", () => {
    const { result } = renderHook(() => useMovementRoundInfo(null, "PAIRS"));
    expect(result.current).toEqual({ info: null, isLoading: false });
  });

  it("reads rounds/boardsPerRound inline for MITCHELL (no fetch)", () => {
    const m: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 5, rounds: 9, boardsPerRound: 3 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m, "PAIRS"));
    expect(result.current.info).toEqual({ rounds: 9, boardsPerRound: 3 });
    // MITCHELL passes a null key to useSWR (no network call).
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("reads inline round info for SWISS", () => {
    const m: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 6, rounds: 7, boardsPerRound: 2 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m, "PAIRS"));
    expect(result.current.info).toEqual({ rounds: 7, boardsPerRound: 2 });
  });

  it("reads inline round info for SWISS_TEAMS", () => {
    const m: SelectedMovement = {
      source: "SWISS_TEAMS",
      swissTeams: { teams: 8, rounds: 5, boardsPerRound: 4 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m, "TEAMS"));
    expect(result.current.info).toEqual({ rounds: 5, boardsPerRound: 4 });
  });

  it("reads inline round info for ROUND_ROBIN_TEAMS", () => {
    const m: SelectedMovement = {
      source: "ROUND_ROBIN_TEAMS",
      roundRobinTeams: { teams: 4, rounds: 3, boardsPerRound: 6 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m, "TEAMS"));
    expect(result.current.info).toEqual({ rounds: 3, boardsPerRound: 6 });
  });

  it("derives SPEC rounds from the fetched movement detail", () => {
    mockUseSWR.mockReturnValue({
      data: { type: "PAIRS", tables: [{ rounds: [{}, {}, {}] }] },
      isLoading: false,
    });
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 12,
      boardsPerRound: 2,
    };
    const { result } = renderHook(() => useMovementRoundInfo(m, "PAIRS"));
    expect(result.current.info).toEqual({ rounds: 3, boardsPerRound: 2 });
  });

  it("returns null info while a SPEC detail is still loading", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 12,
      boardsPerRound: 2,
    };
    const { result } = renderHook(() => useMovementRoundInfo(m, "PAIRS"));
    expect(result.current).toEqual({ info: null, isLoading: true });
  });
});
