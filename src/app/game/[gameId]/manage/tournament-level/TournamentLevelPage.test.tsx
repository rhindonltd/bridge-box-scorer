import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockUpdateTournamentLevel = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/game-service", () => ({
  updateTournamentLevel: (...a: unknown[]) => mockUpdateTournamentLevel(...a),
}));

const mockMutateGame = vi.fn();
let mockGame: Record<string, unknown> = {
  gameId: "g1",
  tournamentLevel: "NORMAL_CLUB",
};
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame, mutateGame: mockMutateGame }),
}));

import { TournamentLevelPage } from "./TournamentLevelPage";

describe("TournamentLevelPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGame = { gameId: "g1", tournamentLevel: "NORMAL_CLUB" };
  });

  function changeLevel(toLabel: string) {
    fireEvent.change(screen.getByLabelText("Tournament Level"), {
      target: { value: optionValueFor(toLabel) },
    });
  }

  // The dropdown shows labels; resolve a label to its enum value.
  function optionValueFor(label: string): string {
    const option = screen
      .getAllByRole("option")
      .find((o) => o.textContent === label) as HTMLOptionElement | undefined;
    if (!option) throw new Error(`No option labelled "${label}"`);
    return option.value;
  }

  it("shows the current level's derived USEBIO fields", () => {
    render(<TournamentLevelPage onDone={vi.fn()} />);
    // Normal Club → Club / BLACK / 10.
    expect(screen.getByText("Club")).toBeInTheDocument();
    expect(screen.getByText("BLACK")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("saves the chosen level, optimistically updates, and calls onDone", async () => {
    const onDone = vi.fn();
    render(<TournamentLevelPage onDone={onDone} />);

    changeLevel("National Heat");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    // Optimistic update applied immediately with revalidate:false.
    expect(mockMutateGame).toHaveBeenCalledWith(
      expect.objectContaining({ tournamentLevel: "NATIONAL_HEAT" }),
      false,
    );

    await waitFor(() =>
      expect(mockUpdateTournamentLevel).toHaveBeenCalledWith(
        "g1",
        "NATIONAL_HEAT",
      ),
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("does not call the server when the level is unchanged", () => {
    const onDone = vi.fn();
    render(<TournamentLevelPage onDone={onDone} />);

    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdateTournamentLevel).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("rolls back the optimistic update and shows an error on failure", async () => {
    mockUpdateTournamentLevel.mockRejectedValueOnce(new Error("boom"));
    const onDone = vi.fn();
    render(<TournamentLevelPage onDone={onDone} />);

    changeLevel("Major County");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    // Rolled back to the original stored value.
    expect(mockMutateGame).toHaveBeenLastCalledWith(
      expect.objectContaining({ tournamentLevel: "NORMAL_CLUB" }),
      false,
    );
    expect(onDone).not.toHaveBeenCalled();
  });
});
