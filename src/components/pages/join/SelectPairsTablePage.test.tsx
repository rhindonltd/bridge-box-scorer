import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SelectPairsTablePage } from "./SelectPairsTablePage";
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

vi.mock("@/components/join/SelectPairsTable", () => ({
  default: ({ tables, startingPositions, setStartingPosition }: any) => (
    <div>
      <div data-testid="tables">{JSON.stringify(tables)}</div>

      <div data-testid="positions">{JSON.stringify(startingPositions)}</div>

      <button
        onClick={() =>
          setStartingPosition({
            pairId: "pair-1",
            position: 4,
          })
        }
      >
        choose pair
      </button>
    </div>
  ),
}));

describe("SelectPairsTablePage", () => {
  const gameSelection = {
    gameId: "game-456",
    tables: [{ id: "table-a" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseGame.mockReturnValue({
      gameSelection,
    });

    mockUseSWR.mockReturnValue({
      data: [
        {
          pairId: "existing-pair",
          position: 2,
        },
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("returns null when gameSelection is missing", () => {
    mockUseGame.mockReturnValue({
      gameSelection: null,
    });

    const { container } = render(<SelectPairsTablePage />);

    expect(container.firstChild).toBeNull();
  });

  it("requests pair starting positions using SWR", () => {
    render(<SelectPairsTablePage />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/pairs/game-456/starting-positions",
      expect.any(Function),
    );
  });

  it("passes SWR data to SelectPairsTable", () => {
    render(<SelectPairsTablePage />);

    expect(screen.getByTestId("positions")).toHaveTextContent("existing-pair");
  });

  it("uses empty array when SWR returns undefined", () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
    });

    render(<SelectPairsTablePage />);

    expect(screen.getByTestId("positions")).toHaveTextContent("[]");
  });

  it("subscribes and unsubscribes socket listeners", () => {
    const { unmount } = render(<SelectPairsTablePage />);

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

  it("updates SWR cache when starting positions arrive", () => {
    render(<SelectPairsTablePage />);

    const handler = mockOn.mock.calls[0][1];

    const payload = {
      startingPositions: [
        {
          pairId: "updated-pair",
          position: 3,
        },
      ],
    };

    handler(payload);

    expect(mockMutate).toHaveBeenCalledWith(
      "/api/games/pairs/game-456/starting-positions",
      payload.startingPositions,
      false,
    );
  });

  it("emits CREATE_PAIR when selecting a position", async () => {
    const user = userEvent.setup();

    render(<SelectPairsTablePage />);

    await user.click(
      screen.getByRole("button", {
        name: /choose pair/i,
      }),
    );

    expect(mockEmit).toHaveBeenCalledWith(SocketEvents.CREATE_PAIR, {
      gameId: "game-456",
      pairStartingPosition: {
        pairId: "pair-1",
        position: 4,
      },
    });
  });

  it("does not subscribe when gameId is missing", () => {
    mockUseGame.mockReturnValue({
      gameSelection: {
        tables: [],
      },
    });

    render(<SelectPairsTablePage />);

    expect(mockOn).not.toHaveBeenCalled();
  });
});
