import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { PairScorecard } from "@/model/scorecard";

type Config = {
  requestEvent: string;
  syncEvent: string;
  leaveEvent: string;
  params: Record<string, unknown>;
  apply: (payload: PairScorecard | null) => void;
  onRequestError?: () => void;
  deps: unknown[];
};

const captured = vi.hoisted(() => ({ config: null as unknown }));
vi.mock("@/hooks/use-feature-snapshot", () => ({
  useFeatureSnapshot: (config: unknown) => {
    captured.config = config;
  },
}));

import { useScorecard } from "./useScorecard";
import { SocketEvents } from "@/socket/socket-events";

const cfg = () => captured.config as Config;

const card: PairScorecard = {
  pairId: "A1NS",
  scoring: "MP",
  boards: [],
  roundVps: null,
};

describe("useScorecard", () => {
  beforeEach(() => {
    captured.config = null;
  });

  it("subscribes to the scorecard events for the seat and starts loading", () => {
    const { result } = renderHook(() => useScorecard("g1", "A1NS"));
    expect(cfg()).toMatchObject({
      requestEvent: SocketEvents.REQUEST_STATE_SCORECARD,
      syncEvent: SocketEvents.SCORECARD_SYNC,
      leaveEvent: SocketEvents.LEAVE_SCORECARD,
      params: { gameId: "g1", seat: "A1NS" },
      deps: ["g1", "A1NS"],
    });
    expect(result.current).toEqual({ card: null, loading: true });
  });

  it("holds the scorecard once a snapshot arrives", () => {
    const { result } = renderHook(() => useScorecard("g1", "A1NS"));
    act(() => cfg().apply(card));
    expect(result.current).toEqual({ card, loading: false });
  });

  it("treats a null snapshot as no scorecard", () => {
    const { result } = renderHook(() => useScorecard("g1", "A1NS"));
    act(() => cfg().apply(null));
    expect(result.current).toEqual({ card: null, loading: false });
  });

  it("stops loading with no scorecard when the request fails", () => {
    const { result } = renderHook(() => useScorecard("g1", "A1NS"));
    act(() => cfg().onRequestError?.());
    expect(result.current).toEqual({ card: null, loading: false });
  });
});
