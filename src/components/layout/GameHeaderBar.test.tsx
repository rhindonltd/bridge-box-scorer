import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { GameHeaderBar } from "./GameHeaderBar";

const mockGame = vi.fn();

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame() }),
}));

beforeEach(() => {
  mockGame.mockReset();
});

describe("GameHeaderBar", () => {
  it("shows session and section together when both are present", () => {
    mockGame.mockReturnValue({
      eventName: "Spring Pairs",
      sessionName: "1",
      sectionName: "A",
    });

    render(<GameHeaderBar headerTitle="Play" />);

    expect(screen.getByText("Play")).toBeInTheDocument();
    expect(screen.getByText("Spring Pairs")).toBeInTheDocument();
    expect(screen.getByText("Session 1, Section A")).toBeInTheDocument();
  });

  it("shows only the session when no section is set", () => {
    mockGame.mockReturnValue({
      eventName: "Spring Pairs",
      sessionName: "1",
      sectionName: "",
    });

    render(<GameHeaderBar headerTitle="Play" />);
    expect(screen.getByText("Session 1")).toBeInTheDocument();
  });

  it("shows only the section when there is no session", () => {
    mockGame.mockReturnValue({
      eventName: "Spring Pairs",
      sessionName: "",
      sectionName: "B",
    });

    render(<GameHeaderBar headerTitle="Play" />);
    expect(screen.getByText("Section B")).toBeInTheDocument();
  });

  it("shows an empty subtitle when neither session nor section is set", () => {
    mockGame.mockReturnValue({
      eventName: "Spring Pairs",
      sessionName: "",
      sectionName: "",
    });

    render(<GameHeaderBar headerTitle="Play" headerRight={<span>Pair 5</span>} />);
    expect(screen.getByText("Spring Pairs")).toBeInTheDocument();
    expect(screen.getByText("Pair 5")).toBeInTheDocument();
  });
});
