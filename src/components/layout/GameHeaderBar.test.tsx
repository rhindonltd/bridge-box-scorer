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

// GameHeaderBar reads the pathname to auto-inject the manage switch; the switch
// itself navigates via the router. Stub both.
const mockPathname = vi.fn<() => string>(() => "/game/g1/play/A1NS");
vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

beforeEach(() => {
  mockGame.mockReset();
  mockPathname.mockReturnValue("/game/g1/play/A1NS");
  localStorage.clear();
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

  it("auto-injects the play⇄manage switch on a manage route", () => {
    mockGame.mockReturnValue({
      gameId: "g1",
      eventName: "Spring Pairs",
      sectionName: "",
    });
    mockPathname.mockReturnValue("/game/g1/manage/travellers");

    render(<GameHeaderBar headerTitle="Travellers" />);

    // Unseated director on a manage screen -> the switch reads "Join".
    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
  });

  it("does not inject the switch on a non-manage game route", () => {
    mockGame.mockReturnValue({
      gameId: "g1",
      eventName: "Spring Pairs",
      sectionName: "",
    });
    mockPathname.mockReturnValue("/game/g1/play/A1NS");

    render(<GameHeaderBar headerTitle="Play" />);

    expect(
      screen.queryByRole("button", { name: "Play" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Join" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a page's explicit headerRight instead of the switch on a manage route", () => {
    mockGame.mockReturnValue({
      gameId: "g1",
      eventName: "Spring Pairs",
      sectionName: "",
    });
    mockPathname.mockReturnValue("/game/g1/manage/travellers");

    render(
      <GameHeaderBar headerTitle="Travellers" headerRight={<span>Custom</span>} />,
    );

    expect(screen.getByText("Custom")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join" })).not.toBeInTheDocument();
  });
});
