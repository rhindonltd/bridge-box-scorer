import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

import { useSelectedMovementName } from "./selected-movement-name";
import type { SelectedMovement } from "@/model/selected-movement";

function mitchell(
  flags: Partial<{
    skip: boolean;
    shareAndRelay: boolean;
    web: boolean;
    hesitation: boolean;
    americanWhist: boolean;
  }> = {},
): SelectedMovement {
  return {
    source: "MITCHELL",
    mitchell: { tables: 5, rounds: 9, boardsPerRound: 2, ...flags },
  };
}

describe("useSelectedMovementName", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: undefined });
  });

  it("returns null with no movement selected", () => {
    const { result } = renderHook(() => useSelectedMovementName(null, "PAIRS"));
    expect(result.current).toBeNull();
  });

  it("names generated Mitchell variants from their flags", () => {
    const cases: [SelectedMovement, string][] = [
      [mitchell(), "Standard Mitchell"],
      [mitchell({ skip: true }), "Skip Mitchell"],
      [mitchell({ shareAndRelay: true }), "Share and Relay Mitchell"],
      [mitchell({ web: true }), "Web Mitchell"],
      [mitchell({ hesitation: true }), "Hesitation Mitchell"],
      [mitchell({ americanWhist: true }), "American Whist"],
    ];
    for (const [m, expected] of cases) {
      const { result } = renderHook(() => useSelectedMovementName(m, "PAIRS"));
      expect(result.current).toBe(expected);
    }
  });

  it("names SWISS locally as 'Swiss Pairs'", () => {
    const m: SelectedMovement = {
      source: "SWISS",
      swiss: { tables: 5, rounds: 7, boardsPerRound: 2 },
    };
    const { result } = renderHook(() => useSelectedMovementName(m, "PAIRS"));
    expect(result.current).toBe("Swiss Pairs");
  });

  it("uses the fetched name for a SPEC selection", () => {
    mockUseSWR.mockReturnValue({ data: { type: "PAIRS", name: "Howell 6T" } });
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 5,
      boardsPerRound: 2,
    };
    const { result } = renderHook(() => useSelectedMovementName(m, "PAIRS"));
    expect(result.current).toBe("Howell 6T");
  });

  it("returns null while a SPEC name is still loading", () => {
    mockUseSWR.mockReturnValue({ data: undefined });
    const m: SelectedMovement = {
      source: "SPEC",
      specId: 5,
      boardsPerRound: 2,
    };
    const { result } = renderHook(() => useSelectedMovementName(m, "PAIRS"));
    expect(result.current).toBeNull();
  });
});
