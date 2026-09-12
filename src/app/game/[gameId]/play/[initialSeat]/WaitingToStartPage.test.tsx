import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let mockSections: { section: string }[] = [{ section: "A" }];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections, isLoading: false }),
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

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockLeaveTable = vi.fn();
vi.mock("@/lib/game-service", () => ({
  leaveTable: (...args: unknown[]) => mockLeaveTable(...args),
}));

// The change-device affordance is covered by its own test; stub it here.
vi.mock(
  "@/app/game/[gameId]/play/[initialSeat]/ChangeDeviceButton",
  () => ({
    ChangeDeviceButton: () => <div data-testid="change-device-button" />,
  }),
);

import { WaitingToStartPage } from "./WaitingToStartPage";
import type { Seat } from "@/model/participants";

describe("WaitingToStartPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSections = [{ section: "A" }];
    mockLeaveTable.mockResolvedValue(undefined);
  });

  it("tells the player it is waiting for the director to start", () => {
    render(<WaitingToStartPage gameId="g1" seat={"A3NS" as Seat} />);
    expect(
      screen.getByText(/Waiting for the director to start/i),
    ).toBeInTheDocument();
    // Auto-advance reassurance is a polite live region.
    expect(screen.getByRole("status")).toHaveTextContent(/as soon as the game starts/i);
  });

  it("shows the player's table and direction", () => {
    render(<WaitingToStartPage gameId="g1" seat={"A3NS" as Seat} />);
    expect(screen.getByText("Table 3")).toBeInTheDocument();
    expect(screen.getByText("North–South")).toBeInTheDocument();
  });

  it("omits the section for a single-section game", () => {
    mockSections = [{ section: "A" }];
    render(<WaitingToStartPage gameId="g1" seat={"A3NS" as Seat} />);
    expect(screen.queryByText(/Section A/)).not.toBeInTheDocument();
  });

  it("shows the section when the game has more than one", () => {
    mockSections = [{ section: "A" }, { section: "B" }];
    render(<WaitingToStartPage gameId="g1" seat={"B2EW" as Seat} />);
    expect(screen.getByText(/Section B/)).toBeInTheDocument();
    expect(screen.getByText("Table 2")).toBeInTheDocument();
    expect(screen.getByText("East–West")).toBeInTheDocument();
  });

  it("falls back to a seat-less message when the seat cannot be parsed", () => {
    render(<WaitingToStartPage gameId="g1" seat={"bogus" as Seat} />);
    expect(
      screen.getByText(/seated and ready to play/i),
    ).toBeInTheDocument();
    expect(screen.queryByText("Table 3")).not.toBeInTheDocument();
  });

  it("leaves the table (after confirm) and returns to the join screen", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<WaitingToStartPage gameId="g1" seat={"A3NS" as Seat} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave table" }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockLeaveTable).toHaveBeenCalledWith("g1", "A3NS"),
    );
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/game/g1/join"),
    );
    confirmSpy.mockRestore();
  });

  it("does not leave when the confirm is cancelled", () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<WaitingToStartPage gameId="g1" seat={"A3NS" as Seat} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave table" }));

    expect(mockLeaveTable).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it("shows an error and stays put when leaving fails", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mockLeaveTable.mockRejectedValue(
      new Error("The game has already started; you can no longer leave your seat."),
    );
    render(<WaitingToStartPage gameId="g1" seat={"A3NS" as Seat} />);

    fireEvent.click(screen.getByRole("button", { name: "Leave table" }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "already started",
      ),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("renders the change-device affordance", () => {
    render(<WaitingToStartPage gameId="g1" seat={"A3NS" as Seat} />);
    expect(screen.getByTestId("change-device-button")).toBeInTheDocument();
  });
});
