import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createFlow, useFlow } from "./flow";

// Mock next/navigation
const mockPush = vi.fn();
const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => ({ get: mockGet }),
}));

describe("createFlow", () => {
  it("returns the first step as default", () => {
    const flow = createFlow(
      { stepA: {}, stepB: {} },
      ["stepA", "stepB"] as const,
    );
    expect(flow.getDefaultStep()).toBe("stepA");
  });

  it("canEnter returns true when no guard is defined", () => {
    const flow = createFlow(
      { stepA: {}, stepB: {} },
      ["stepA", "stepB"] as const,
    );
    expect(flow.canEnter("stepA", {})).toBe(true);
  });

  it("canEnter respects the guard function", () => {
    const flow = createFlow(
      {
        stepA: {},
        stepB: { canEnter: (state: { ready: boolean }) => state.ready },
      },
      ["stepA", "stepB"] as const,
    );
    expect(flow.canEnter("stepB", { ready: false })).toBe(false);
    expect(flow.canEnter("stepB", { ready: true })).toBe(true);
  });
});

describe("useFlow", () => {
  const flow = createFlow(
    {
      first: {},
      second: { canEnter: (s: { allowed: boolean }) => s.allowed },
      third: {},
    },
    ["first", "second", "third"] as const,
  );

  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockReturnValue(null);
  });

  it("returns the default step when no step param is present", () => {
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() =>
      useFlow(flow, { allowed: true }, "/base"),
    );

    expect(result.current.step).toBe("first");
  });

  it("returns the step from search params when canEnter allows it", () => {
    mockGet.mockReturnValue("second");

    const { result } = renderHook(() =>
      useFlow(flow, { allowed: true }, "/base"),
    );

    expect(result.current.step).toBe("second");
  });

  it("falls back to default step when canEnter blocks entry", () => {
    mockGet.mockReturnValue("second");

    const { result } = renderHook(() =>
      useFlow(flow, { allowed: false }, "/base"),
    );

    expect(result.current.step).toBe("first");
  });

  it("goTo navigates to the specified step", () => {
    mockGet.mockReturnValue(null);

    const { result } = renderHook(() =>
      useFlow(flow, { allowed: true }, "/base"),
    );

    act(() => {
      result.current.goTo("third");
    });

    expect(mockPush).toHaveBeenCalledWith("/base?step=third");
  });

  it("next advances to the next step in order", () => {
    mockGet.mockReturnValue("first");

    const { result } = renderHook(() =>
      useFlow(flow, { allowed: true }, "/base"),
    );

    act(() => {
      result.current.next();
    });

    expect(mockPush).toHaveBeenCalledWith("/base?step=second");
  });

  it("next does nothing on the last step", () => {
    mockGet.mockReturnValue("third");

    const { result } = renderHook(() =>
      useFlow(flow, { allowed: true }, "/base"),
    );

    act(() => {
      result.current.next();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("back navigates to the previous step", () => {
    mockGet.mockReturnValue("second");

    const { result } = renderHook(() =>
      useFlow(flow, { allowed: true }, "/base"),
    );

    act(() => {
      result.current.back();
    });

    expect(mockPush).toHaveBeenCalledWith("/base?step=first");
  });

  it("back does nothing on the first step", () => {
    mockGet.mockReturnValue("first");

    const { result } = renderHook(() =>
      useFlow(flow, { allowed: true }, "/base"),
    );

    act(() => {
      result.current.back();
    });

    expect(mockPush).not.toHaveBeenCalled();
  });
});
