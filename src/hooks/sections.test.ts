import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const mockUseSWR = vi.fn();
const mockGlobalMutate = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
  mutate: (...args: unknown[]) => mockGlobalMutate(...args),
}));

const registered: { event: string; handler: () => void }[] = [];
vi.mock("@/hooks/socket-event", () => ({
  useSocketEvent: (event: string, handler: () => void) => {
    registered.push({ event, handler });
  },
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

import { useSections } from "./sections";
import { SocketEvents } from "@/socket/socket-events";

describe("useSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    registered.length = 0;
  });

  it("returns the fetched sections", () => {
    mockUseSWR.mockReturnValue({
      data: { sections: [{ section: "A" }, { section: "B" }] },
      isLoading: false,
      error: undefined,
    });

    const { result } = renderHook(() => useSections("g1"));
    expect(result.current.sections).toEqual([
      { section: "A" },
      { section: "B" },
    ]);
    expect(result.current.isLoading).toBe(false);
  });

  it("defaults to an empty array when there is no data", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: undefined,
    });

    const { result } = renderHook(() => useSections("g1"));
    expect(result.current.sections).toEqual([]);
    expect(result.current.isLoading).toBe(true);
  });

  it("revalidates on GAME_UPDATED, SECTION_UPDATED and CONNECT events", () => {
    mockUseSWR.mockReturnValue({
      data: { sections: [] },
      isLoading: false,
      error: undefined,
    });

    renderHook(() => useSections("g1"));

    const events = registered.map((r) => r.event);
    expect(events).toContain(SocketEvents.GAME_UPDATED);
    expect(events).toContain(SocketEvents.SECTION_UPDATED);
    expect(events).toContain(SocketEvents.CONNECT);

    // Firing a registered handler triggers a mutate of the sections key.
    registered[0].handler();
    expect(mockGlobalMutate).toHaveBeenCalled();
  });
});
