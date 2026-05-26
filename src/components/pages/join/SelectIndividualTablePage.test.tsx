import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { SelectIndividualTablePage } from "./SelectIndividualTablePage";
import { SocketEvents } from "@/socket/socket-events";

const mockMutate = vi.fn();
const mockEmit = vi.fn();
const mockOn = vi.fn();
const mockOff = vi.fn();

const socket = {
  emit: mockEmit,
  on: mockOn,
  off: mockOff,
};

const mockUseGame = vi.fn();
const mockUseSWR = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

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

vi.mock("@/lib/socket", () => ({
  getSocket: () => socket,
}));

vi.mock("@/components/common/SectionInfo", () => ({
  SectionInfo: () => <div>SectionInfo</div>,
}));

vi.mock("@/components/join/SelectIndividualTable", () => ({
  default: ({ tables, startingPositions, setStartingPosition }: any) => (
    <div>
      <div data-testid="tables">{JSON.stringify(tables)}</div>

      <div data-testid="positions">{JSON.stringify(startingPositions)}</div>

      <button
        onClick={() =>
          setStartingPosition({
            playerId: "player-1",
            position: 2,
          })
        }
      >
        choose seat
      </button>
    </div>
  ),
}));

describe("SelectIndividualTablePage", () => {
  const gameSelection = {
    gameId: "game-123",
    tables: [{ id: "table-1" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGame.mockReturnValue({
      gameSelection,
    });

    mockUseSWR.mockReturnValue({
      data: [
        {
          playerId: "p1",
          position: 1,
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("returns null when no gameSelection exists", () => {
    mockUseGame.mockReturnValue({
      gameSelection: null,
    });

    const { container } = render(<SelectIndividualTablePage />);

    expect(container.firstChild).toBeNull();
  });

  it("loads starting positions with correct SWR key", () => {
    render(<SelectIndividualTablePage />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/individual/game-123/starting-positions",
      expect.any(Function),
    );
  });

  it("passes fetched data to SelectIndividualTable", () => {
    render(<SelectIndividualTablePage />);

    expect(screen.getByTestId("positions")).toHaveTextContent("p1");
  });

  it("falls back to empty array when SWR has no data", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
    });

    render(<SelectIndividualTablePage />);

    expect(screen.getByTestId("positions")).toHaveTextContent("[]");
  });

  it("subscribes and unsubscribes to socket updates", () => {
    const { unmount } = render(<SelectIndividualTablePage />);

    expect(mockOn).toHaveBeenCalledWith(
      SocketEvents.STARTING_POSITIONS,
      expect.any(Function),
    );

    unmount();

    expect(mockOff).toHaveBeenCalledWith(
      SocketEvents.STARTING_POSITIONS,
      expect.any(Function),
    );
  });

  it("mutates SWR cache when socket receives positions", () => {
    render(<SelectIndividualTablePage />);

    const handler = mockOn.mock.calls[0][1];

    const payload = {
      startingPositions: [
        {
          playerId: "new-player",
          position: 3,
        },
      ],
    };

    handler(payload);

    expect(mockMutate).toHaveBeenCalledWith(
      "/api/games/individual/game-123/starting-positions",
      payload.startingPositions,
      false,
    );
  });

  it("emits SELECT_SEAT when selecting a position", async () => {
    const user = userEvent.setup();

    render(<SelectIndividualTablePage />);

    await user.click(
      screen.getByRole("button", {
        name: /choose seat/i,
      }),
    );

    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.SELECT_SEAT, {
      gameId: "game-123",
      playerStartingPosition: {
        playerId: "player-1",
        position: 2,
      },
    });
  });

  it("does not subscribe to socket when gameId is missing", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        tables: [],
      },
    });

    render(<SelectIndividualTablePage />);

    expect(mockOn).not.toHaveBeenCalled();
  });
});
