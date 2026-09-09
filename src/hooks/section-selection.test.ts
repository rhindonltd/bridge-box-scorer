import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

let mockSections: { section: string; label: string }[] = [];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections, isLoading: false }),
}));

import { useSectionSelection } from "./section-selection";

describe("useSectionSelection", () => {
  beforeEach(() => {
    mockSections = [
      { section: "A", label: "A" },
      { section: "B", label: "B" },
    ];
  });

  it("defaults to the first section", () => {
    const { result } = renderHook(() => useSectionSelection("g1"));
    expect(result.current.selected).toBe("A");
  });

  it("follows an explicit selection", () => {
    const { result } = renderHook(() => useSectionSelection("g1"));
    act(() => result.current.setSelected("B"));
    expect(result.current.selected).toBe("B");
  });

  it("falls back to the first section when the selected one disappears", () => {
    const { result, rerender } = renderHook(() => useSectionSelection("g1"));
    act(() => result.current.setSelected("B"));
    expect(result.current.selected).toBe("B");

    // Section B is removed.
    mockSections = [{ section: "A", label: "A" }];
    rerender();
    expect(result.current.selected).toBe("A");
  });

  it("returns null when there are no sections", () => {
    mockSections = [];
    const { result } = renderHook(() => useSectionSelection("g1"));
    expect(result.current.selected).toBeNull();
  });
});
