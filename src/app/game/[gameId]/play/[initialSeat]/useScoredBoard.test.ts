import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { BoardInstance } from "@/model/participants";

const mockContext = vi.fn();
vi.mock("@/context/TravellerContext", () => ({
  useTravellerContext: () => mockContext(),
}));

import { useScoredBoard } from "./useScoredBoard";

function instance(
  ns: string,
  ew: string,
  currentResult: string | null,
): BoardInstance {
  return {
    roundNumber: 1,
    tableNumber: 1,
    boardNumber: 1,
    participants: { type: "PAIRS", ns, ew },
    currentResult,
    status: null,
  };
}

describe("useScoredBoard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no instance has a result yet", () => {
    mockContext.mockReturnValue({
      instances: [instance("A1NS", "A1EW", null)],
      deal: null,
    });

    const { result } = renderHook(() => useScoredBoard("g1", 1, "MP"));
    expect(result.current).toBeNull();
  });

  it("scores the board from the instances that have a result", () => {
    mockContext.mockReturnValue({
      instances: [
        instance("A1NS", "A1EW", "3NTN="),
        instance("A2NS", "A2EW", "4SN+1"),
        // No result yet — excluded from scoring.
        instance("A3NS", "A3EW", null),
      ],
      deal: null,
    });

    const { result } = renderHook(() => useScoredBoard("g1", 1, "MP"));

    expect(result.current).not.toBeNull();
    // Two results submitted -> two scored lines on the board.
    expect(result.current!.lines).toHaveLength(2);
  });
});
