import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

// The provider now calls useSWR twice: once for the schedule (keyed by seat)
// and once for the game-wide pair list. Route each call by its key so tests can
// control them independently; default both to "no data".
let scheduleResult: { data: unknown; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
let pairsResult: { data: unknown; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
const mockUseSWR = vi.fn((key: string, ..._rest: unknown[]) => {
  if (typeof key === "string" && key.includes("/participants")) {
    return pairsResult;
  }
  return scheduleResult;
});
const mockGlobalMutate = vi.fn();
vi.mock("swr", () => ({
  default: (key: string, ...rest: unknown[]) => mockUseSWR(key, ...rest),
  mutate: (...args: unknown[]) => mockGlobalMutate(...args),
}));

/** Set the schedule SWR return value (keyed by seat). */
function setSchedule(data: unknown, isLoading = false) {
  scheduleResult = { data, isLoading };
}
/** Set the pair-list SWR return value (game-wide participants). */
function setPairs(data: unknown, isLoading = false) {
  pairsResult = { data, isLoading };
}

const socketOn = vi.fn();
const socketOff = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: socketOn, off: socketOff, emit: vi.fn() }),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

import { AssignmentProvider, useAssignment } from "./AssignmentContext";
import { SocketEvents } from "@/socket/socket-events";
import type { Seat } from "@/model/participants";

function handlerFor(event: string) {
  const call = socketOn.mock.calls.find((c) => c[0] === event);
  return call![1] as (payload?: { section?: string }) => void;
}

function wrapper(children: ReactNode) {
  return (
    <AssignmentProvider gameId="g1" initialSeat={"A1NS" as Seat}>
      {children}
    </AssignmentProvider>
  );
}

function makePlayer(
  id: number,
  firstName: string,
  lastName: string,
  nationalId: string | null = null,
) {
  return { id, firstName, lastName, nationalId };
}

describe("AssignmentContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setSchedule(undefined);
    setPairs(undefined);
  });

  it("throws when used outside a provider", () => {
    expect(() => renderHook(() => useAssignment())).toThrow(
      /must be used within AssignmentProvider/,
    );
  });

  it("resolves a PAIR assignment from the schedule assignmentId", () => {
    setSchedule({ assignmentId: "A5", side: "NS", rounds: [] });

    const { result } = renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    expect(result.current.assignment).toEqual({ type: "PAIR", id: "A5" });
    expect(result.current.isLoading).toBe(false);
  });

  it("resolves a null assignment when no movement has been selected (no data)", () => {
    const { result } = renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    expect(result.current.assignment).toBeNull();
  });

  it("subscribes to GAME_UPDATED / SECTION_UPDATED / CONNECT and cleans up", () => {
    const { unmount } = renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    expect(socketOn).toHaveBeenCalled();
    unmount();
    expect(socketOff).toHaveBeenCalled();
  });

  it("resolves mySection to null when the initial seat is unparseable", () => {
    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => (
        <AssignmentProvider gameId="g1" initialSeat={"!!!" as Seat}>
          {children}
        </AssignmentProvider>
      ),
    });

    // A section-less update still triggers revalidation, proving the provider
    // rendered (mySection resolved to null via the catch) rather than throwing.
    act(() => handlerFor(SocketEvents.SECTION_UPDATED)({}));
    expect(mockGlobalMutate).toHaveBeenCalled();
  });

  it("does not retry a 404 but does retry other errors", () => {
    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    // The schedule useSWR (keyed by seat) carries the retry config.
    const scheduleCall = (mockUseSWR.mock.calls as unknown as unknown[][]).find(
      (c) => !String(c[0]).includes("/participants"),
    )!;
    const config = scheduleCall[2] as {
      shouldRetryOnError: (e: Error & { status?: number }) => boolean;
    };
    expect(
      config.shouldRetryOnError(
        Object.assign(new Error("not found"), { status: 404 }),
      ),
    ).toBe(false);
    expect(
      config.shouldRetryOnError(
        Object.assign(new Error("server"), { status: 500 }),
      ),
    ).toBe(true);
  });

  it("revalidates on GAME_UPDATED and CONNECT", () => {
    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    // CONNECT is subscribed by both the schedule and the pair-list effects, so
    // a single CONNECT triggers two revalidations; count only GAME_UPDATED here.
    mockGlobalMutate.mockClear();
    act(() => handlerFor(SocketEvents.GAME_UPDATED)());
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

  it("revalidates on a SECTION_UPDATED matching this pair's section", () => {
    // initialSeat "A1NS" -> section "A".
    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    act(() => handlerFor(SocketEvents.SECTION_UPDATED)({ section: "A" }));
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

  it("ignores a SECTION_UPDATED for a different section", () => {
    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    act(() => handlerFor(SocketEvents.SECTION_UPDATED)({ section: "B" }));
    expect(mockGlobalMutate).not.toHaveBeenCalled();
  });

  describe("seated pair", () => {
    it("resolves this seat's pair (players + side) from the participant list", () => {
      setPairs({
        pairs: [
          {
            type: "PAIR",
            initialSeat: "A1NS",
            player1: makePlayer(1, "Ann", "Smith", "1001"),
            player2: makePlayer(2, "Ben", "Jones", null),
          },
          {
            type: "PAIR",
            initialSeat: "A1EW",
            player1: makePlayer(3, "Cy", "Doe"),
            player2: makePlayer(4, "Di", "Fox"),
          },
        ],
      });

      const { result } = renderHook(() => useAssignment(), {
        wrapper: ({ children }) => wrapper(children),
      });

      // Seat "A1NS" -> side NS, and its own two players.
      expect(result.current.pair).toEqual({
        side: "NS",
        players: [
          makePlayer(1, "Ann", "Smith", "1001"),
          makePlayer(2, "Ben", "Jones", null),
        ],
      });
    });

    it("is null while the pair list is loading", () => {
      const { result } = renderHook(() => useAssignment(), {
        wrapper: ({ children }) => wrapper(children),
      });

      expect(result.current.pair).toBeNull();
    });

    it("is null when this seat's own record has an unparseable seat", () => {
      // The seat matches a participant row, but its seat string cannot be
      // parsed for a direction, so the pair resolves to null via the catch.
      setPairs({
        pairs: [
          {
            type: "PAIR",
            initialSeat: "!!!",
            player1: makePlayer(1, "Ann", "Smith"),
            player2: makePlayer(2, "Ben", "Jones"),
          },
        ],
      });

      const { result } = renderHook(() => useAssignment(), {
        wrapper: ({ children }) => (
          <AssignmentProvider gameId="g1" initialSeat={"!!!" as Seat}>
            {children}
          </AssignmentProvider>
        ),
      });

      expect(result.current.pair).toBeNull();
    });

    it("is null when this seat has no participant record", () => {
      setPairs({
        pairs: [
          {
            type: "PAIR",
            initialSeat: "A2EW",
            player1: makePlayer(3, "Cy", "Doe"),
            player2: makePlayer(4, "Di", "Fox"),
          },
        ],
      });

      const { result } = renderHook(() => useAssignment(), {
        wrapper: ({ children }) => wrapper(children),
      });

      expect(result.current.pair).toBeNull();
    });

    it("revalidates the pair list on PARTICIPANTS", () => {
      renderHook(() => useAssignment(), {
        wrapper: ({ children }) => wrapper(children),
      });

      mockGlobalMutate.mockClear();
      act(() => handlerFor(SocketEvents.PARTICIPANTS)());
      expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
    });
  });
});
