import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { GameHeaderBar } from "./GameHeaderBar";

const mockGame = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame() }),
}));

// HeaderBar's default back arrow uses the router-backed hook; stub it so this
// test stays focused on GameHeaderBar's subtitle logic.
vi.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: () => ({ onBack: vi.fn() }),
}));

beforeEach(() => {
  mockGame.mockReset();
});

describe("GameHeaderBar", () => {
  it("shows the section when one is set", () => {
    mockGame.mockReturnValue({
      eventName: "Spring Pairs",
      sectionName: "B",
    });

    render(<GameHeaderBar headerTitle="Play" />);

    expect(screen.getByText("Play")).toBeInTheDocument();
    expect(screen.getByText("Spring Pairs")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
  });

  it("shows an empty subtitle when no section is set", () => {
    mockGame.mockReturnValue({
      eventName: "Spring Pairs",
      sectionName: "",
    });

    render(<GameHeaderBar headerTitle="Play" headerRight={<span>Pair 5</span>} />);
    expect(screen.getByText("Spring Pairs")).toBeInTheDocument();
    expect(screen.getByText("Pair 5")).toBeInTheDocument();
  });
});
