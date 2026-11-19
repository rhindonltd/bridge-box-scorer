import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }),
}));

const mockMutateGame = vi.fn();
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1" },
    mutateGame: mockMutateGame,
  }),
}));

let mockCheck: {
  canFinalise: boolean;
  problems: { code: string; message: string; section?: string }[];
  isLoading: boolean;
} = { canFinalise: false, problems: [], isLoading: false };
vi.mock("@/hooks/finalise-check", () => ({
  useFinaliseCheck: () => mockCheck,
}));

let mockSections: { section: string; label: string }[] = [];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections }),
}));

const mockFinalise = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/game-service", () => ({
  finaliseGame: (...a: unknown[]) => mockFinalise(...a),
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

import { FinaliseGameScreen } from "./FinaliseGameScreen";

describe("FinaliseGameScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSections = [];
    mockCheck = { canFinalise: false, problems: [], isLoading: false };
  });

  it("lists the problems and offers no finalise button", () => {
    mockCheck = {
      canFinalise: false,
      problems: [
        {
          code: "RESULTS_OUTSTANDING",
          message: "2 of 6 results are outstanding.",
        },
      ],
      isLoading: false,
    };
    render(<FinaliseGameScreen />);
    expect(screen.getByText("2 of 6 results are outstanding.")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Finalise game" }),
    ).not.toBeInTheDocument();
  });

  it("groups problems under section headings for a multi-section game", () => {
    mockSections = [
      { section: "A", label: "Red" },
      { section: "B", label: "Blue" },
    ];
    mockCheck = {
      canFinalise: false,
      problems: [
        { code: "RESULTS_OUTSTANDING", message: "a", section: "A" },
        { code: "RESULTS_OUTSTANDING", message: "b", section: "B" },
      ],
      isLoading: false,
    };
    render(<FinaliseGameScreen />);
    expect(screen.getByText("Red")).toBeVisible();
    expect(screen.getByText("Blue")).toBeVisible();
  });

  it("shows nothing while the check is loading", () => {
    mockCheck = { canFinalise: false, problems: [], isLoading: true };
    render(<FinaliseGameScreen />);
    expect(screen.queryByText(/Resolve the following/)).not.toBeInTheDocument();
  });

  it("asks for confirmation, then finalises and returns to the main menu", async () => {
    mockCheck = { canFinalise: true, problems: [], isLoading: false };
    render(<FinaliseGameScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Finalise game" }));
    expect(mockFinalise).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Finalise" }));
    await waitFor(() => expect(mockFinalise).toHaveBeenCalledWith("g1"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(mockMutateGame).toHaveBeenCalled();
  });

  it("can cancel the confirmation", () => {
    mockCheck = { canFinalise: true, problems: [], isLoading: false };
    render(<FinaliseGameScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Finalise game" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("button", { name: "Finalise game" })).toBeVisible();
    expect(mockFinalise).not.toHaveBeenCalled();
  });

  it("alerts and stays put when finalising fails", async () => {
    mockCheck = { canFinalise: true, problems: [], isLoading: false };
    mockFinalise.mockRejectedValueOnce(new Error("nope"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    render(<FinaliseGameScreen />);
    fireEvent.click(screen.getByRole("button", { name: "Finalise game" }));
    fireEvent.click(screen.getByRole("button", { name: "Finalise" }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("nope"));
    expect(mockReplace).not.toHaveBeenCalled();
  });
  it("groups problems with no section together, without a heading", () => {
    mockCheck = {
      canFinalise: false,
      problems: [
        { code: "X", message: "one" },
        { code: "Y", message: "two" },
      ],
      isLoading: false,
    };
    render(<FinaliseGameScreen />);
    expect(screen.getByText("one")).toBeVisible();
    expect(screen.getByText("two")).toBeVisible();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });
  it("uses the section letter when a section has no label", () => {
    mockSections = [{ section: "A", label: "Red" }];
    mockCheck = {
      canFinalise: false,
      problems: [
        { code: "X", message: "a", section: "A" },
        { code: "X", message: "c", section: "C" },
      ],
      isLoading: false,
    };
    render(<FinaliseGameScreen />);
    expect(screen.getByRole("heading", { name: "Red" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "C" })).toBeVisible();
  });
});
