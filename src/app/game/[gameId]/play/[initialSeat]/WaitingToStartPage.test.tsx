import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

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

import { WaitingToStartPage } from "./WaitingToStartPage";
import type { Seat } from "@/model/participants";

describe("WaitingToStartPage", () => {
  beforeEach(() => {
    mockSections = [{ section: "A" }];
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
});
