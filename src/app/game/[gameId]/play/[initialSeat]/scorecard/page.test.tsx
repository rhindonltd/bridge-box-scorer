import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useParams: () => ({ gameId: "g1", initialSeat: "A3NS" }),
  useRouter: () => ({ replace: mockReplace }),
}));

let mockGame = { gameId: "g1", combinedRanking: true };
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame }),
}));

let mockSections: { section: string }[] = [{ section: "A" }];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections }),
}));

let mockTakenOver = false;
vi.mock("@/hooks/seat-taken-over", () => ({
  useSeatTakenOver: () => mockTakenOver,
}));

const mockUseScorecard = vi.fn();
vi.mock(
  "@/app/game/[gameId]/play/[initialSeat]/scorecard/useScorecard",
  () => ({
    useScorecard: (...a: unknown[]) => mockUseScorecard(...a),
  }),
);

vi.mock("@/app/game/[gameId]/play/[initialSeat]/SeatTakenOverPage", () => ({
  SeatTakenOverPage: () => <div>seat-moved</div>,
}));
vi.mock(
  "@/app/game/[gameId]/play/[initialSeat]/scorecard/ScorecardPage",
  () => ({
    ScorecardPage: ({
      hideSection,
      loading,
      onBack,
    }: {
      hideSection: boolean;
      loading: boolean;
      onBack: () => void;
    }) => (
      <div>
        <span>hide:{String(hideSection)}</span>
        <span>loading:{String(loading)}</span>
        <button type="button" onClick={onBack}>
          back
        </button>
      </div>
    ),
  }),
);

import ScorecardRoute from "./page";

describe("ScorecardRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTakenOver = false;
    mockGame = { gameId: "g1", combinedRanking: true };
    mockSections = [{ section: "A" }];
    mockUseScorecard.mockReturnValue({ card: null, loading: true });
  });

  it("loads this seat's scorecard and goes back to its play screen", () => {
    render(<ScorecardRoute />);
    expect(mockUseScorecard).toHaveBeenCalledWith("g1", "A3NS");
    expect(screen.getByText("loading:true")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "back" }));
    expect(mockReplace).toHaveBeenCalledWith("/game/g1/play/A3NS");
  });

  it("keeps the section on pair numbers only when sections are combined", () => {
    const { unmount } = render(<ScorecardRoute />);
    expect(screen.getByText("hide:true")).toBeInTheDocument(); // one section
    unmount();

    mockSections = [{ section: "A" }, { section: "B" }];
    const combined = render(<ScorecardRoute />);
    expect(screen.getByText("hide:false")).toBeInTheDocument();
    combined.unmount();

    mockGame = { gameId: "g1", combinedRanking: false };
    render(<ScorecardRoute />);
    expect(screen.getByText("hide:true")).toBeInTheDocument();
  });

  it("shows the seat-moved screen if another device takes the seat", () => {
    mockTakenOver = true;
    render(<ScorecardRoute />);
    expect(screen.getByText("seat-moved")).toBeInTheDocument();
  });
});
