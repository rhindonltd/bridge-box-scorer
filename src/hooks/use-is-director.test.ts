import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { useIsDirector } from "./use-is-director";

describe("useIsDirector", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns true when a director token is stored for the game", () => {
    localStorage.setItem("director:g1", "tok");
    const { result } = renderHook(() => useIsDirector("g1"));
    expect(result.current).toBe(true);
  });

  it("returns false when no director token is stored for the game", () => {
    const { result } = renderHook(() => useIsDirector("g1"));
    expect(result.current).toBe(false);
  });

  it("is scoped per game", () => {
    localStorage.setItem("director:g1", "tok");
    expect(renderHook(() => useIsDirector("g1")).result.current).toBe(true);
    expect(renderHook(() => useIsDirector("g2")).result.current).toBe(false);
  });
});
