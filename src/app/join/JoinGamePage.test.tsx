import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/components/pages/SelectGamePage", () => ({
  default: ({
    headerTitle,
    onGameSelected,
  }: {
    headerTitle: string;
    onGameSelected: (gameId: string) => void;
  }) => (
    <button onClick={() => onGameSelected("g1")}>{headerTitle}</button>
  ),
}));

import { JoinGamePage } from "./JoinGamePage";

describe("JoinGamePage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the join header and navigates to the game join page on selection", () => {
    render(<JoinGamePage />);

    const trigger = screen.getByRole("button", { name: "Join Game" });
    expect(trigger).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(mockPush).toHaveBeenCalledWith("/game/g1/join");
  });
});
