import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseSWR = vi.fn();
const mockGlobalMutate = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
  mutate: (...args: unknown[]) => mockGlobalMutate(...args),
}));

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

describe("AssignmentContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when used outside a provider", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
    expect(() => renderHook(() => useAssignment())).toThrow(
      /must be used within AssignmentProvider/,
    );
  });

  it("resolves a PAIR assignment from the schedule assignmentId", () => {
    mockUseSWR.mockReturnValue({
      data: { assignmentId: "A5", side: "NS", rounds: [] },
      isLoading: false,
    });

    const { result } = renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    expect(result.current.assignment).toEqual({ type: "PAIR", id: "A5" });
    expect(result.current.isLoading).toBe(false);
  });

  it("resolves a null assignment when no movement has been selected (no data)", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });

    const { result } = renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    expect(result.current.assignment).toBeNull();
  });

  it("subscribes to GAME_UPDATED / SECTION_UPDATED / CONNECT and cleans up", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });

    const { unmount } = renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    expect(socketOn).toHaveBeenCalled();
    unmount();
    expect(socketOff).toHaveBeenCalled();
  });

  it("resolves mySection to null when the initial seat is unparseable", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });

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
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    const config = mockUseSWR.mock.calls[0][2] as {
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
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    act(() => handlerFor(SocketEvents.GAME_UPDATED)());
    act(() => handlerFor(SocketEvents.CONNECT)());
    expect(mockGlobalMutate).toHaveBeenCalledTimes(2);
  });

  it("revalidates on a SECTION_UPDATED matching this pair's section", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });

    // initialSeat "A1NS" -> section "A".
    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    act(() => handlerFor(SocketEvents.SECTION_UPDATED)({ section: "A" }));
    expect(mockGlobalMutate).toHaveBeenCalledTimes(1);
  });

  it("ignores a SECTION_UPDATED for a different section", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });

    renderHook(() => useAssignment(), {
      wrapper: ({ children }) => wrapper(children),
    });

    act(() => handlerFor(SocketEvents.SECTION_UPDATED)({ section: "B" }));
    expect(mockGlobalMutate).not.toHaveBeenCalled();
  });
});
