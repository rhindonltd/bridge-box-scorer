import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SelectIndividualTablePage } from "./SelectIndividualTablePage";
import { SocketEvents } from "@/socket/socket-events";

const mockMutate = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

vi.mock("@/components/common/SectionInfo", () => ({
  SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/join/SelectIndividualTable", () => ({
  default: vi.fn(
    ({
      tables,
      startingPositions,
      onSeatSelected,
    }: {
      tables: unknown[];
      startingPositions: unknown[];
      onSeatSelected: unknown;
    }) => (
      <div data-testid="table">
        {JSON.stringify({
          tables,
          startingPositions,
          hasHandler: !!onSeatSelected,
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

describe("SelectIndividualTablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSWR.mockReturnValue({
      data: [],
    });
  });

  it("renders nothing when no gameSelection exists", () => {
    mockUseGame.mockReturnValue({
      gameSelection: null,
    });

    const { container } = render(
      <SelectIndividualTablePage onSeatSelected={vi.fn()} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("renders section info and table with SWR data", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "game-1",
        tables: ["table-a"],
      },
    });

    mockUseSWR.mockReturnValue({
      data: [{ playerId: "1", seat: "A" }],
    });

    render(<SelectIndividualTablePage onSeatSelected={vi.fn()} />);

    expect(screen.getByTestId("section-info")).toBeInTheDocument();

    expect(screen.getByTestId("table")).toHaveTextContent(
      JSON.stringify({
        tables: ["table-a"],
        startingPositions: [{ playerId: "1", seat: "A" }],
        hasHandler: true,
      }),
    );
  });

  it("uses empty array when SWR data is undefined", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "game-1",
        tables: ["table-a"],
      },
    });

    mockUseSWR.mockReturnValue({
      data: undefined,
    });

    render(<SelectIndividualTablePage onSeatSelected={vi.fn()} />);

    expect(screen.getByTestId("table")).toHaveTextContent(
      `"startingPositions":[]`,
    );
  });

  it("subscribes to socket updates", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "game-123",
        tables: [],
      },
    });

    render(<SelectIndividualTablePage onSeatSelected={vi.fn()} />);

    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.STARTING_POSITIONS,
      expect.any(Function),
    );
  });

  it("mutates SWR cache when socket event fires", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "game-123",
        tables: [],
      },
    });

    render(<SelectIndividualTablePage onSeatSelected={vi.fn()} />);

    const handler = mockOn.mock.calls[0][1];

    const payload = {
      startingPositions: [{ playerId: "99", seat: "B" }],
    };

    handler(payload);

    expect(mockMutate).toHaveBeenCalledWith(
      "/api/games/individual/game-123/starting-positions",
      payload.startingPositions,
      false,
    );
  });

  it("removes socket listener on unmount", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        gameId: "game-123",
        tables: [],
      },
    });

    const { unmount } = render(
      <SelectIndividualTablePage onSeatSelected={vi.fn()} />,
    );

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

    render(<SelectIndividualTablePage onSeatSelected={vi.fn()} />);

    expect(mockOn).not.toHaveBeenCalled();
  });
});
