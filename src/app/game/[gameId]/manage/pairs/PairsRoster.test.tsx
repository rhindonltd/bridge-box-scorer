import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockMutate = vi.fn();
let rosterState: { data: unknown; isLoading: boolean };
let gameData: unknown;
vi.mock("swr", () => ({
  default: (key: string) =>
    key === "roster:g1"
      ? { ...rosterState, mutate: mockMutate }
      : { data: gameData },
}));
vi.mock("@/lib/fetcher", () => ({ unwrapFetcher: () => vi.fn() }));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: {
    roster: (id: string) => `roster:${id}`,
    game: (id: string) => `game:${id}`,
  },
}));
vi.mock("@/hooks/use-socket-revalidate", () => ({
  useSocketRevalidate: vi.fn(),
}));

const mockSetAbsence = vi.fn();
const mockSetSub = vi.fn();
const mockWithdraw = vi.fn();
vi.mock("@/lib/game-service", () => ({
  setAbsenceTreatment: (...a: unknown[]) => mockSetAbsence(...a),
  setSubstitutionOptions: (...a: unknown[]) => mockSetSub(...a),
  withdrawPairAsDirector: (...a: unknown[]) => mockWithdraw(...a),
}));
vi.mock("@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceView", () => ({
  ChangeDeviceView: (p: { seat: string; kind?: string; byDirector?: boolean }) => (
    <div data-testid={`cdv-${p.seat}`}>
      {p.kind ?? ""}|{String(!!p.byDirector)}
    </div>
  ),
}));
vi.mock("@/components/common/Spinner", () => ({
  FullScreenSpinner: () => <div data-testid="spinner" />,
}));

let lastProps: any;
vi.mock("@/app/game/[gameId]/manage/pairs/PairsRosterPage", () => ({
  PairsRosterPage: (props: any) => {
    lastProps = props;
    return (
      <div>
        <button onClick={props.onBack}>back</button>
        <span data-testid="isPairs">{String(props.isPairs)}</span>
        <span data-testid="roster">{props.roster.length}</span>
        {props.renderReinstatePanel("S1")}
        {props.renderMoveDevicePanel("S2")}
      </div>
    );
  },
}));

import { PairsRoster } from "./PairsRoster";

describe("PairsRoster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rosterState = { data: [{ seat: "A1NS" }], isLoading: false };
    gameData = { gameType: "PAIRS" };
    mockSetAbsence.mockResolvedValue(undefined);
    mockSetSub.mockResolvedValue(undefined);
    mockWithdraw.mockResolvedValue(undefined);
    mockMutate.mockResolvedValue(undefined);
  });

  it("shows a spinner while loading", () => {
    rosterState = { data: undefined, isLoading: true };
    render(<PairsRoster gameId="g1" />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("passes the roster and routes back", () => {
    render(<PairsRoster gameId="g1" />);
    expect(screen.getByTestId("roster").textContent).toBe("1");
    expect(screen.getByTestId("isPairs").textContent).toBe("true");
    fireEvent.click(screen.getByText("back"));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage");
  });

  it("defaults to an empty roster and non-pairs while data is missing", () => {
    rosterState = { data: undefined, isLoading: false };
    gameData = { gameType: "TEAMS" };
    render(<PairsRoster gameId="g1" />);
    expect(screen.getByTestId("roster").textContent).toBe("0");
    expect(screen.getByTestId("isPairs").textContent).toBe("false");
  });

  it("renders the reinstate and move-device panels", () => {
    render(<PairsRoster gameId="g1" />);
    expect(screen.getByTestId("cdv-S1").textContent).toBe("REINSTATE|false");
    expect(screen.getByTestId("cdv-S2").textContent).toBe("|true");
  });

  it("saves substitution options then re-reads the roster", async () => {
    render(<PairsRoster gameId="g1" />);
    const opts = { splitSection: true };
    await lastProps.onSaveSubstitution("A1NS", opts);
    expect(mockSetSub).toHaveBeenCalledWith("g1", "A1NS", opts);
    expect(mockMutate).toHaveBeenCalled();
  });

  it("sets an absence treatment then re-reads the roster", async () => {
    render(<PairsRoster gameId="g1" />);
    await lastProps.onSetAbsenceTreatment("A1NS", "REMOVED");
    expect(mockSetAbsence).toHaveBeenCalledWith("g1", "A1NS", "REMOVED");
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
  });

  it("withdraws a pair then re-reads the roster", async () => {
    render(<PairsRoster gameId="g1" />);
    await lastProps.onWithdraw("A1NS");
    expect(mockWithdraw).toHaveBeenCalledWith("g1", "A1NS");
    expect(mockMutate).toHaveBeenCalled();
  });
});
