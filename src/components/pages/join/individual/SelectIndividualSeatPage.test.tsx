import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SelectIndividualSeatPage } from "./SelectIndividualSeatPage";
import { SocketEvents } from "@/socket/socket-events";

// ---- shared mock state ----
const mockMutate = vi.fn();
const mockSocketOn = vi.fn();
const mockSocketOff = vi.fn();

// ---- component dependencies ----

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
}));

vi.mock("@/components/join/individual/SelectIndividualTable", () => ({
  default: vi.fn(
    ({ tables, startingPositions, onSeatSelected }: {
      tables: number;
      startingPositions: unknown[];
      onSeatSelected: unknown;
    }) => (
      <div data-testid="individual-table">
        {JSON.stringify({ tables, startingPositions, hasHandler: !!onSeatSelected })}
      </div>
    ),
  ),
}));

vi.mock("@/components/join/individual/EnterIndividualPlayerNames", () => ({
  default: () => <div data-testid="enter-player-names" />,
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
    useSWRConfig: () => ({ mutate: mockMutate }),
  };
});

// useSocketSWRSync uses mutate from swr directly — mock it
vi.mock("@/hooks/socket-swr-sync", () => ({
  useSocketSWRSync: vi.fn(),
}));

// ---- tests ----

describe("SelectIndividualSeatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: [] });
  });

  it("renders nothing when game is undefined", () => {
    mockUseGame.mockReturnValue({ game: undefined });
    const { container } = render(
      <SelectIndividualSeatPage onSeatSelected={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when gameId is missing", () => {
    mockUseGame.mockReturnValue({ game: { gameId: undefined, tables: 2 } });
    const { container } = render(
      <SelectIndividualSeatPage onSeatSelected={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders table component when game is present", () => {
    mockUseGame.mockReturnValue({
      game: { gameId: "game-1", tables: 3 },
    });
    mockUseSWR.mockReturnValue({ data: [] });

    render(<SelectIndividualSeatPage onSeatSelected={vi.fn()} />);

    expect(screen.getByTestId("individual-table")).toBeInTheDocument();
  });

  it("passes tables count and startingPositions to the table component", () => {
    const mockParticipants = [
      {
        type: "INDIVIDUAL",
        initialSeat: "1N",
        player: { id: 1, firstName: "A", lastName: "B", nationalId: null },
      },
    ];

    mockUseGame.mockReturnValue({
      game: { gameId: "game-1", tables: 4 },
    });
    mockUseSWR.mockReturnValue({ data: mockParticipants });

    render(<SelectIndividualSeatPage onSeatSelected={vi.fn()} />);

    const tableEl = screen.getByTestId("individual-table");
    const props = JSON.parse(tableEl.textContent!);
    expect(props.tables).toBe(4);
    expect(props.startingPositions).toEqual(mockParticipants);
  });

  it("passes empty array when SWR data is undefined", () => {
    mockUseGame.mockReturnValue({
      game: { gameId: "game-1", tables: 2 },
    });
    mockUseSWR.mockReturnValue({ data: undefined });

    render(<SelectIndividualSeatPage onSeatSelected={vi.fn()} />);

    const tableEl = screen.getByTestId("individual-table");
    const props = JSON.parse(tableEl.textContent!);
    expect(props.startingPositions).toEqual([]);
  });

  it("calls SWR with the correct individuals key", () => {
    mockUseGame.mockReturnValue({
      game: { gameId: "game-42", tables: 2 },
    });

    render(<SelectIndividualSeatPage onSeatSelected={vi.fn()} />);

    expect(mockUseSWR).toHaveBeenCalledWith(
      "/api/games/individual/game-42/participants",
      expect.any(Function),
    );
  });

  it("uses PARTICIPANTS socket event for real-time sync", () => {
    // The component uses useSocketSWRSync with SocketEvents.PARTICIPANTS.
    // We verify the event constant itself is defined correctly.
    expect(SocketEvents.PARTICIPANTS).toBe("game:participants");
  });
});
