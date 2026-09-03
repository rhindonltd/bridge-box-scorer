import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

import { PlayProvider, usePlay } from "./PlayContext";

const wrapper = ({ children }: { children: ReactNode }) => (
  <PlayProvider>{children}</PlayProvider>
);

describe("PlayContext", () => {
  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => usePlay())).toThrow(
      /must be used within PlayProvider/,
    );
  });

  it("starts with no board or round selection", () => {
    const { result } = renderHook(() => usePlay(), { wrapper });
    expect(result.current.boardSelection).toBeNull();
    expect(result.current.roundSelection).toBeNull();
  });

  it("selects and clears a board", () => {
    const { result } = renderHook(() => usePlay(), { wrapper });

    act(() => result.current.selectBoard(5));
    expect(result.current.boardSelection).toEqual({ board: 5 });

    act(() => result.current.clearBoard());
    expect(result.current.boardSelection).toBeNull();
  });

  it("selects and clears a round independently of the board", () => {
    const { result } = renderHook(() => usePlay(), { wrapper });

    act(() => result.current.selectRound(3));
    act(() => result.current.selectBoard(2));
    expect(result.current.roundSelection).toEqual({ round: 3 });
    expect(result.current.boardSelection).toEqual({ board: 2 });

    act(() => result.current.clearRound());
    expect(result.current.roundSelection).toBeNull();
    // Clearing the round does not clear the board.
    expect(result.current.boardSelection).toEqual({ board: 2 });
  });
});
