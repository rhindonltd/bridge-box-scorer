import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useBoardFlow } from "./board-flow";

describe("useBoardFlow", () => {
  it("starts at step 0 with empty contract state", () => {
    const { result } = renderHook(() =>
      useBoardFlow({ leadCardRequired: true }),
    );
    expect(result.current.step).toBe(0);
    expect(result.current.level).toBeNull();
    expect(result.current.suit).toBeNull();
  });

  it("records the selected board and advances to the level step", () => {
    const { result } = renderHook(() =>
      useBoardFlow({ leadCardRequired: true }),
    );

    expect(result.current.selectedBoard).toBeNull();

    act(() => result.current.onBoardSelected(4));
    expect(result.current.selectedBoard).toBe(4);
    expect(result.current.step).toBe(1);
  });

  it("clears the selected board when stepping back from level to board", () => {
    const { result } = renderHook(() =>
      useBoardFlow({ leadCardRequired: true }),
    );

    act(() => result.current.onBoardSelected(2));
    expect(result.current.step).toBe(1);

    act(() => result.current.handleBack());
    expect(result.current.step).toBe(0);
    expect(result.current.selectedBoard).toBeNull();
  });

  it("walks the played-contract path including the lead step when required", () => {
    const { result } = renderHook(() =>
      useBoardFlow({ leadCardRequired: true }),
    );

    act(() => result.current.onLevelSelected(3));
    expect(result.current.level).toBe(3);
    expect(result.current.step).toBe(2);

    act(() => result.current.onSuitSelected("NT"));
    expect(result.current.suit).toBe("NT");
    expect(result.current.step).toBe(3);

    act(() => result.current.onDeclarerSelected("N", ""));
    expect(result.current.declarer).toBe("N");
    // leadCardRequired -> lead step (4)
    expect(result.current.step).toBe(4);

    act(() => result.current.onLeadComplete("H", "K"));
    expect(result.current.leadSuit).toBe("H");
    expect(result.current.leadRank).toBe("K");
    expect(result.current.step).toBe(5);

    act(() => result.current.onResultComplete("made", 1));
    expect(result.current.resultMode).toBe("made");
    expect(result.current.resultValue).toBe(1);
    expect(result.current.step).toBe(6);
  });

  it("skips the lead step when lead card is not required", () => {
    const { result } = renderHook(() =>
      useBoardFlow({ leadCardRequired: false }),
    );

    act(() => result.current.onLevelSelected(4));
    act(() => result.current.onSuitSelected("S"));
    act(() => result.current.onDeclarerSelected("S", "X"));
    // No lead step -> jumps straight to result (5)
    expect(result.current.step).toBe(5);
    expect(result.current.dbl).toBe("X");
  });

  it("routes a special outcome straight to the result summary step", () => {
    const { result } = renderHook(() =>
      useBoardFlow({ leadCardRequired: true }),
    );

    act(() => result.current.onLevelSelected(3));
    act(() => result.current.onSpecialOutcome("PO"));

    expect(result.current.specialOutcome).toBe("PO");
    expect(result.current.level).toBeNull();
    expect(result.current.step).toBe(6);
  });

  it("handleBack steps backwards through the played path", () => {
    const { result } = renderHook(() =>
      useBoardFlow({ leadCardRequired: true }),
    );

    // Advance to step 6 via the played path.
    act(() => result.current.onLevelSelected(3));
    act(() => result.current.onSuitSelected("NT"));
    act(() => result.current.onDeclarerSelected("N", ""));
    act(() => result.current.onLeadComplete("H", "K"));
    act(() => result.current.onResultComplete("made", 0));
    expect(result.current.step).toBe(6);

    // From result summary, back goes to result entry (5).
    act(() => result.current.handleBack());
    expect(result.current.step).toBe(5);

    // From result entry with lead required, back goes to lead (4).
    act(() => result.current.handleBack());
    expect(result.current.step).toBe(4);
  });

  it("handleBack from the summary returns to step 1 for a special outcome", () => {
    const { result } = renderHook(() =>
      useBoardFlow({ leadCardRequired: true }),
    );

    act(() => result.current.onLevelSelected(3));
    act(() => result.current.onSpecialOutcome("PO"));
    expect(result.current.step).toBe(6);

    act(() => result.current.handleBack());
    expect(result.current.step).toBe(1);
  });
});
