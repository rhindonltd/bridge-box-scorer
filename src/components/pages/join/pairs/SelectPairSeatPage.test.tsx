import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SelectPairSeatPage } from "./SelectPairSeatPage";
import { SocketEvents } from "@/socket/socket-events";

const mockMutate = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("@/components/common/SectionInfo", () => ({
  SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/join/SelectPairsTable", () => ({
  default: vi.fn(
    ({
      tables,
      startingPositions,
      onSelectSeat,
    }: {
      tables: unknown[];
      startingPositions: unknown[];
      onSelectSeat: unknown;
    }) => (
      <div data-testid="pairs-table">
        {JSON.stringify({
          tables,
          startingPositions,
          hasHandler: !!onSelectSeat,
        })}
      </div>
    ),
  ),
}));

const mockUseGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({
    on: mockOn,
    off: mockOff,
  }),
}));

const mockUseSWR = vi.fn();

vi.mock("swr", async () => {
  const actual = await vi.importActual("swr");

  return {
    ...actual,
    default: (...args: unknown[]) => mockUseSWR(...args),
    useSWRConfig: () => ({
      mutate: mockMutate,
    }),
  };
});

describe("SelectPairsTablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSWR.mockReturnValue({
      data: [],
    });
  });

  it("renders nothing when gameSelection is missing", () => {
    mockUseGame.mockReturnValue({
      gameSelection: null,
    });

    const { container } = render(
      <SelectPairSeatPage onSeatSelected={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  // it("renders section info and table with SWR data", () => {
  //   mockUseGame.mockReturnValue({
  //     gameSelection: {
  //       gameId: "game-1",
  //       tables: ["table-1"],
  //     },
  //   });
  //
  //   mockUseSWR.mockReturnValue({
  //     data: [{ pairId: "pair-1" }],
  //   });
  //
  //   render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);
  //
  //   expect(screen.getByTestId("section-info")).toBeInTheDocument();
  //
  //   expect(screen.getByTestId("pairs-table")).toHaveTextContent(
  //     JSON.stringify({
  //       tables: ["table-1"],
  //       startingPositions: [{ pairId: "pair-1" }],
  //       hasHandler: true,
  //     }),
  //   );
  // });

  it("passes empty array when SWR data is undefined", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "game-1",
        tables: ["table-1"],
      },
    });

    mockUseSWR.mockReturnValue({
      data: undefined,
    });

    render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    expect(screen.getByTestId("pairs-table")).toHaveTextContent(
      `"startingPositions":[]`,
    );
  });

  it("subscribes to socket updates", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "pairs-123",
        tables: [],
      },
    });

    render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.STARTING_POSITIONS,
      expect.any(Function),
    );
  });

  it("updates SWR cache when socket event fires", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "pairs-123",
        tables: [],
      },
    });

    render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    const handler = mockOn.mock.calls[0][1];

    const payload = {
      startingPositions: [{ pairId: "updated" }],
    };

    handler(payload);

    expect(mockMutate).toHaveBeenCalledWith(
      "/api/games/pairs/pairs-123/initial-seat",
      payload.startingPositions,
      false,
    );
  });

  it("removes socket listener on unmount", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "pairs-123",
        tables: [],
      },
    });

    const { unmount } = render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    const handler = mockOn.mock.calls[0][1];

    unmount();

    expect(mockOff).toHaveBeenCalledWith(
      SocketEvents.STARTING_POSITIONS,
      handler,
    );
  });

  it("does not subscribe when gameId is missing", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: undefined,
        tables: [],
      },
    });

    render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    expect(mockOn).not.toHaveBeenCalled();
    expect(mockOff).not.toHaveBeenCalled();
  });

  // it("passes onSelectSeat through to SelectPairsTable", () => {
  //   const onSelectSeat = vi.fn();
  //
  //   mockUseGame.mockReturnValue({
  //     gameSelection: {
  //       gameId: "game-1",
  //       tables: [],
  //     },
  //   });
  //
  //   render(<SelectPairSeatPage onSeatSelected={onSelectSeat} />);
  //
  //   expect(screen.getByTestId("pairs-table")).toHaveTextContent(
  //     `"hasHandler":true`,
  //   );
  // });
});
