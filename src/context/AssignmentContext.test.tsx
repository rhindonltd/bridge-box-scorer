import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
  mutate: vi.fn(),
}));

const socketOn = vi.fn();
const socketOff = vi.fn();
vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: socketOn, off: socketOff, emit: vi.fn() }),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

import { AssignmentProvider, useAssignment } from "./AssignmentContext";
import type { Seat } from "@/model/participants";

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
});
