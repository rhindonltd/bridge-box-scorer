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
vi.mock("swr", () => ({
  default: () => ({ ...rosterState, mutate: mockMutate }),
}));
let sectionsData: unknown[] = [];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: sectionsData }),
}));
const mockSetStanding = vi.fn();
vi.mock("@/lib/standing-service", () => ({
  setParticipantStanding: (...a: unknown[]) => mockSetStanding(...a),
}));
vi.mock("@/lib/fetcher", () => ({ unwrapFetcher: () => vi.fn() }));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: { teamsRoster: (id: string) => `teams-roster:${id}` },
}));
const mockRevalidate = vi.fn();
vi.mock("@/hooks/use-socket-revalidate", () => ({
  useSocketRevalidate: (...a: unknown[]) => mockRevalidate(...a),
}));
vi.mock("@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceView", () => ({
  ChangeDeviceView: (p: { seat: string; byDirector?: boolean }) => (
    <div data-testid={`cdv-${p.seat}`}>{String(!!p.byDirector)}</div>
  ),
}));
vi.mock("@/components/common/Spinner", () => ({
  FullScreenSpinner: () => <div data-testid="spinner" />,
}));
let lastProps: any;
vi.mock("@/app/game/[gameId]/manage/teams/TeamsRosterPage", () => ({
  TeamsRosterPage: (props: any) => {
    lastProps = props;
    return (
      <div>
        <button onClick={props.onBack}>back</button>
        <span data-testid="roster">{props.roster.length}</span>
        <span data-testid="labels">{JSON.stringify(props.sectionLabels)}</span>
        {props.renderMoveDevicePanel("A1NS")}
      </div>
    );
  },
}));
import { TeamsRoster } from "./TeamsRoster";
describe("TeamsRoster", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rosterState = { data: [{ teamId: "A1NS" }], isLoading: false };
    sectionsData = [];
    mockMutate.mockResolvedValue(undefined);
    mockSetStanding.mockResolvedValue(undefined);
  });
  it("shows a spinner while loading", () => {
    rosterState = { data: undefined, isLoading: true };
    render(<TeamsRoster gameId="g1" />);
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });
  it("passes the roster and section labels through", () => {
    sectionsData = [{ section: "A", label: "Red" }];
    render(<TeamsRoster gameId="g1" />);
    expect(screen.getByTestId("roster").textContent).toBe("1");
    expect(screen.getByTestId("labels").textContent).toBe('{"A":"Red"}');
  });
  it("defaults to an empty roster while data is missing", () => {
    rosterState = { data: undefined, isLoading: false };
    render(<TeamsRoster gameId="g1" />);
    expect(screen.getByTestId("roster").textContent).toBe("0");
  });
  it("re-reads the roster on participant changes", () => {
    render(<TeamsRoster gameId="g1" />);
    expect(mockRevalidate).toHaveBeenCalledWith(
      "teams-roster:g1",
      expect.any(Array),
      ["teams-roster:g1"],
    );
  });
  it("backs out by popping history", () => {
    recordAppNavigation();
    render(<TeamsRoster gameId="g1" />);
    fireEvent.click(screen.getByText("back"));
    expect(mockBack).toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
  it("falls back to the manage menu when opened directly", () => {
    resetAppNavigation();
    render(<TeamsRoster gameId="g1" />);
    fireEvent.click(screen.getByText("back"));
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/manage");
  });
  it("renders the move-device panel as a director action", () => {
    render(<TeamsRoster gameId="g1" />);
    expect(screen.getByTestId("cdv-A1NS").textContent).toBe("true");
  });
  it("changes a team's standing then re-reads the roster", async () => {
    render(<TeamsRoster gameId="g1" />);
    await lastProps.onChangeStanding("A1NS", { standing: "WITHOUT_STANDING" });
    expect(mockSetStanding).toHaveBeenCalledWith("g1", "A1NS", {
      standing: "WITHOUT_STANDING",
    });
    await waitFor(() => expect(mockMutate).toHaveBeenCalled());
  });
});
