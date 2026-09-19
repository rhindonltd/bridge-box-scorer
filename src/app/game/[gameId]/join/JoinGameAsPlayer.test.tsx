import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" }, mutateGame: vi.fn() }),
}));

// Stub SelectSeatPage to expose a button that invokes onSeatSelected with a
// fixed seat, so we assert the container's routing behaviour in isolation.
vi.mock("@/app/game/[gameId]/join/SelectSeatPage", () => ({
  SelectSeatPage: ({
    onSeatSelected,
  }: {
    onSeatSelected: (seat: string) => void;
  }) => (
    <button data-testid="select-seat" onClick={() => onSeatSelected("A3NS")}>
      select
    </button>
  ),
}));

import JoinGameAsPlayer from "./JoinGameAsPlayer";

describe("JoinGameAsPlayer", () => {
  beforeEach(() => vi.clearAllMocks());

  it("routes to the seat's play screen when a seat is selected", () => {
    render(<JoinGameAsPlayer />);

    fireEvent.click(screen.getByTestId("select-seat"));

    expect(mockReplace).toHaveBeenCalledWith("/game/g1/play/A3NS");
  });
});
