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
    const { result } = renderHook(() => useMovementRoundInfo(null));
    expect(result.current).toEqual({ info: null, isLoading: false });
  });

  it("reads rounds/boardsPerRound inline for MITCHELL (no fetch)", () => {
    const m: SelectedMovement = {
      source: "MITCHELL",
      mitchell: { tables: 5, rounds: 9, boardsPerRound: 3 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current.info).toEqual({ rounds: 9, boardsPerRound: 3 });
    // MITCHELL passes a null key to useSWR (no network call).
    expect(mockUseSWR).toHaveBeenCalledWith(null, expect.any(Function));
  });

  it("reads inline round info for SWISS", () => {
    const m: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 6, rounds: 7, boardsPerRound: 2 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current.info).toEqual({ rounds: 7, boardsPerRound: 2 });
  });

  it("reads inline round info for SWISS_TEAMS", () => {
    const m: SelectedMovement = {
      source: "SWISS_TEAMS",
      swissTeams: { teams: 8, rounds: 5, boardsPerRound: 4 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current.info).toEqual({ rounds: 5, boardsPerRound: 4 });
  });

  it("derives AMERICAN_WHIST_TEAMS round info from the team count", () => {
    const m: SelectedMovement = {
      source: "AMERICAN_WHIST_TEAMS",
      americanWhistTeams: { teams: 5, boardsPerRound: 6 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current.info).toEqual({ rounds: 4, boardsPerRound: 6 });
  });

  it("gives a Stagger teams − 1 rounds", () => {
    const m: SelectedMovement = {
      source: "STAGGER_TEAMS",
      staggerTeams: { teams: 6, boardsPerRound: 4 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current.info).toEqual({ rounds: 5, boardsPerRound: 4 });
  });
  it("gives a Thurner teams − 1 rounds", () => {
    const m: SelectedMovement = {
      source: "THURNER_TEAMS",
      thurnerTeams: { teams: 8, boardsPerRound: 3 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current.info).toEqual({ rounds: 7, boardsPerRound: 3 });
  });
  it("gives a Circulation three rounds at its boards per round", () => {
    const m: SelectedMovement = {
      source: "CIRCULATION_TEAMS",
      circulationTeams: { boardsPerRound: 8 },
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current.info).toEqual({ rounds: 3, boardsPerRound: 8 });
  });
  it("derives SPEC rounds from the fetched movement detail", () => {
    mockUseSWR.mockReturnValue({
      data: { tables: [{ rounds: [{}, {}, {}] }] },
      isLoading: false,
    });
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 12,
      boardsPerRound: 2,
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current.info).toEqual({ rounds: 3, boardsPerRound: 2 });
  });

  it("returns null info while a SPEC detail is still loading", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 12,
      boardsPerRound: 2,
    };
    const { result } = renderHook(() => useMovementRoundInfo(m));
    expect(result.current).toEqual({ info: null, isLoading: true });
  });
});
