import { describe, it, expect, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

import { usePlayerSeat } from "./use-player-seat";
import { setPlayerToken } from "@/lib/player-token";

describe("usePlayerSeat", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the seat when a player token is stored for the game", () => {
    setPlayerToken("g1", { startingPosition: "A3NS", token: "tok" });
    const { result } = renderHook(() => usePlayerSeat("g1"));
    expect(result.current).toBe("A3NS");
  });

  it("returns null when the device is not seated in the game", () => {
    const { result } = renderHook(() => usePlayerSeat("g1"));
    expect(result.current).toBeNull();
  });

  it("is scoped per game", () => {
    setPlayerToken("g1", { startingPosition: "A3NS", token: "tok" });
    expect(renderHook(() => usePlayerSeat("g1")).result.current).toBe("A3NS");
    expect(renderHook(() => usePlayerSeat("g2")).result.current).toBeNull();
  });
});
