import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockBack = vi.fn();
const mockReplace = vi.fn();
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  usePathname: () => mockPathname,
}));

// The global setup stubs this hook so shared-header component tests don't need
// a mounted router. This file tests the real implementation, so opt back in to
// the actual module.
vi.unmock("@/hooks/useBackNavigation");

import { useBackNavigation, useTrackAppNavigation } from "./useBackNavigation";
import { resetAppNavigation, hasInAppHistory } from "@/lib/nav-history";

describe("useBackNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAppNavigation();
    mockPathname = "/";
  });

  it("calls router.back() when the app has navigated in-app", () => {
    // Simulate one in-app navigation: first render is the entry point, the
    // second (with a changed pathname) is the in-app navigation.
    mockPathname = "/a";
    const tracker = renderHook(() => useTrackAppNavigation());
    mockPathname = "/b";
    tracker.rerender();
    expect(hasInAppHistory()).toBe(true);

    const { result } = renderHook(() => useBackNavigation());
    result.current.onBack();

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("falls back to '/' via replace when there is no in-app history", () => {
    const { result } = renderHook(() => useBackNavigation());
    result.current.onBack();

    expect(mockReplace).toHaveBeenCalledWith("/");
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("respects a custom fallbackHref", () => {
    const { result } = renderHook(() => useBackNavigation("/settings"));
    result.current.onBack();

    expect(mockReplace).toHaveBeenCalledWith("/settings");
    expect(mockBack).not.toHaveBeenCalled();
  });
});

describe("useTrackAppNavigation", () => {
  beforeEach(() => {
    resetAppNavigation();
    mockPathname = "/";
  });

  it("does not count the first render as an in-app navigation", () => {
    renderHook(() => useTrackAppNavigation());
    expect(hasInAppHistory()).toBe(false);
  });

  it("counts subsequent pathname changes as in-app navigations", () => {
    mockPathname = "/one";
    const { rerender } = renderHook(() => useTrackAppNavigation());
    expect(hasInAppHistory()).toBe(false);

    mockPathname = "/two";
    rerender();
    expect(hasInAppHistory()).toBe(true);
  });
});
