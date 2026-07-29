import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SelectPairSeatPage } from "./SelectPairSeatPage";
import { SocketEvents } from "@/socket/socket-events";

// ---- shared mock state ----
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();

// ---- component dependencies ----

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
}));

vi.mock("@/components/join/pairs/SelectPairsTable", () => ({
  default: vi.fn(
    ({
      tables,
      startingPositions,
      onSeatSelected,
    }: {
      tables: number;
      startingPositions: unknown[];
      onSeatSelected: unknown;
    }) => (
      <div data-testid="pairs-table">
        {JSON.stringify({
          tables,
          startingPositions,
          hasHandler: !!onSeatSelected,
        })}
      </div>
    ),
  ),
}));

vi.mock("@/components/join/pairs/EnterPairPlayerNames", () => ({
  default: () => <div data-testid="enter-pair-names" />,
}));

const mockUseGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useGame: () => mockUseGame(),
}));

vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => ({ on: mockSocketOn, off: mockSocketOff }),
}));

const mockUseSWR = vi.fn();
vi.mock("swr", async () => {
  const actual = await vi.importActual("swr");
  return {
    ...actual,
    default: (...args: unknown[]) => mockUseSWR(...args),
    useSWRConfig: () => ({ mutate: vi.fn() }),
  };
});

vi.mock("@/hooks/socket-swr-sync", () => ({
  useSocketSWRSync: vi.fn(),
}));

// ---- tests ----

describe("SelectPairSeatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: [] });
  });

  it("renders nothing when game is undefined", () => {
    mockUseGame.mockReturnValue({ game: undefined });
    const { container } = render(
      <SelectPairSeatPage onSeatSelected={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when gameId is missing", () => {
    mockUseGame.mockReturnValue({ game: { gameId: undefined, tables: 2 } });
    const { container } = render(
      <SelectPairSeatPage onSeatSelected={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders table component when game is present", () => {
    mockUseGame.mockReturnValue({
      game: { gameId: "pairs-1", tables: 3 },
    });
    mockUseSWR.mockReturnValue({ data: [] });

    render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    expect(screen.getByTestId("pairs-table")).toBeInTheDocument();
  });

  it("passes tables count and startingPositions to the table component", () => {
    const mockPairs = [
      {
        type: "PAIR",
        initialSeat: "1NS",
        player1: { id: 1, firstName: "A", lastName: "B", nationalId: null },
        player2: { id: 2, firstName: "C", lastName: "D", nationalId: null },
      },
    ];

    mockUseGame.mockReturnValue({
      game: { gameId: "pairs-1", tables: 5 },
    });
    mockUseSWR.mockReturnValue({ data: mockPairs });

    render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    const tableEl = screen.getByTestId("pairs-table");
    const props = JSON.parse(tableEl.textContent!);
    expect(props.tables).toBe(5);
    expect(props.startingPositions).toEqual(mockPairs);
  });

  it("passes empty array when SWR data is undefined", () => {
    mockUseGame.mockReturnValue({
      game: { gameId: "pairs-1", tables: 2 },
    });
    mockUseSWR.mockReturnValue({ data: undefined });

    render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    const tableEl = screen.getByTestId("pairs-table");
    const props = JSON.parse(tableEl.textContent!);
    expect(props.startingPositions).toEqual([]);
  });

  it("calls SWR with the correct pairs key", () => {
    mockUseGame.mockReturnValue({
      game: { gameId: "pairs-42", tables: 2 },
    });

    render(<SelectPairSeatPage onSeatSelected={vi.fn()} />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/pairs/pairs-42/pairs",
      expect.any(Function),
    );
  });

  it("uses PARTICIPANTS socket event for real-time sync", () => {
    expect(SocketEvents.PARTICIPANTS).toBe("game:participants");
  });
});
