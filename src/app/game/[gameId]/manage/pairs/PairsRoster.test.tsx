import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPush = vi.fn();
const mockBack = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace }),
}));
import { recordAppNavigation, resetAppNavigation } from "@/lib/nav-history";
// The global setup stubs this hook; these tests check the real back behaviour.
vi.unmock("@/hooks/useBackNavigation");

const mockMutate = vi.fn();
let rosterState: { data: unknown; isLoading: boolean };
let gameData: unknown;
const mockGlobalMutate = vi.fn();
vi.mock("swr", () => ({
  default: (key: string) =>
    key === "roster:g1"
      ? { ...rosterState, mutate: mockMutate }
      : { data: gameData },
  useSWRConfig: () => ({ mutate: mockGlobalMutate }),
}));
let sectionsData: unknown[] = [];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: sectionsData }),
}));
const mockSetStanding = vi.fn();
vi.mock("@/lib/standing-service", () => ({
  setParticipantStanding: (...a: unknown[]) => mockSetStanding(...a),
}));
const mockSetSwiss = vi.fn();
vi.mock("@/lib/section-service", () => ({
  setSectionSwissMovement: (...a: unknown[]) => mockSetSwiss(...a),
}));
vi.mock("@/lib/fetcher", () => ({ unwrapFetcher: () => vi.fn() }));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: {
    roster: (id: string) => `roster:${id}`,
    game: (id: string) => `game:${id}`,
    sections: (id: string) => `sections:${id}`,
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
  ChangeDeviceView: (p: {
    seat: string;
    kind?: string;
    byDirector?: boolean;
  }) => (
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
    mockGlobalMutate.mockResolvedValue(undefined);
    mockSetStanding.mockResolvedValue(undefined);
    mockSetSwiss.mockResolvedValue(undefined);
    sectionsData = [];
  });

  it("shows a spinner while loading", () => {
    rosterState = { data: undefined, isLoading: true };
    render(<PairsRoster gameId="g1" />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("passes the roster through", () => {
    render(<PairsRoster gameId="g1" />);
    expect(screen.getByTestId("roster").textContent).toBe("1");
    expect(screen.getByTestId("isPairs").textContent).toBe("true");
  });

  it("backs out by popping history, not by pushing the menu again", () => {
    // Pushing the parent would add a second entry, so the browser back button
    // would loop between the two screens.
    recordAppNavigation();
    render(<PairsRoster gameId="g1" />);
    fireEvent.click(screen.getByText("back"));
    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("falls back to the parent (replacing, not pushing) when opened directly", () => {
    resetAppNavigation();
    render(<PairsRoster gameId="g1" />);
    fireEvent.click(screen.getByText("back"));
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/manage");
    expect(mockPush).not.toHaveBeenCalled();
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

  it("changes a pair's standing then re-reads the roster", async () => {
    render(<PairsRoster gameId="g1" />);
    await lastProps.onChangeStanding("A1NS", { standing: "WITHOUT_STANDING" });
    expect(mockSetStanding).toHaveBeenCalledWith("g1", "A1NS", {
      standing: "WITHOUT_STANDING",
    });
    expect(mockMutate).toHaveBeenCalled();
  });

  describe("Swiss stationary control", () => {
    const spec = { tables: 4, rounds: 4, boardsPerRound: 2 };
    const entry = { seat: "A2EW", anchorId: "A6" };

    beforeEach(() => {
      gameData = { gameType: "PAIRS", eventFormat: "SWISS" };
      sectionsData = [
        {
          section: "A",
          selectedMovement: {
            source: "SWISS",
            swiss: { ...spec, stationaryPairs: [1] },
          },
        },
      ];
    });

    it("is not offered outside a Swiss game", () => {
      gameData = { gameType: "PAIRS", eventFormat: "STANDARD" };
      render(<PairsRoster gameId="g1" />);
      expect(lastProps.stationary).toBeUndefined();
    });

    it("reads a pair's flag from its section's Swiss spec by movement id", () => {
      render(<PairsRoster gameId="g1" />);
      const { isStationary } = lastProps.stationary;
      expect(isStationary({ seat: "A1NS", anchorId: "A1" })).toBe(true);
      expect(isStationary(entry)).toBe(false);
      // No movement id, or a section with no Swiss spec: can't be marked.
      expect(isStationary({ seat: "A1NS" })).toBeNull();
      expect(isStationary({ seat: "B1NS", anchorId: "B1" })).toBeNull();
    });

    it("adds the pair to the spec's stationary list and re-reads sections", async () => {
      render(<PairsRoster gameId="g1" />);
      await lastProps.stationary.toggle(entry);
      expect(mockSetSwiss).toHaveBeenCalledWith("g1", "A", {
        ...spec,
        stationaryPairs: [1, 6],
      });
      expect(mockGlobalMutate).toHaveBeenCalledWith("sections:g1");
    });

    it("removes a pair that is already stationary", async () => {
      render(<PairsRoster gameId="g1" />);
      await lastProps.stationary.toggle({ seat: "A1NS", anchorId: "A1" });
      expect(mockSetSwiss).toHaveBeenCalledWith("g1", "A", {
        ...spec,
        stationaryPairs: [],
      });
    });

    it("saves nothing for a pair with no movement id", async () => {
      render(<PairsRoster gameId="g1" />);
      await lastProps.stationary.toggle({ seat: "A1NS" });
      expect(mockSetSwiss).not.toHaveBeenCalled();
    });
  });
});
