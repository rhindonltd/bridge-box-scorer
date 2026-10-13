import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockUpdateEventDetails = vi.fn().mockResolvedValue(undefined);
const mockUpdateTournamentLevel = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/game-service", () => ({
  updateEventDetails: (...a: unknown[]) => mockUpdateEventDetails(...a),
  updateTournamentLevel: (...a: unknown[]) => mockUpdateTournamentLevel(...a),
}));

const mockMutateGame = vi.fn();
let mockGame: Record<string, unknown>;
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame, mutateGame: mockMutateGame }),
}));

import { EditEventDetailsPage } from "./EditEventDetailsPage";

function baseGame(overrides: Record<string, unknown> = {}) {
  return {
    gameId: "g1",
    eventName: "Monday Pairs",
    director: "Jane",
    gameType: "PAIRS",
    eventFormat: "STANDARD",
    scoringType: "MP",
    tournamentLevel: "NORMAL_CLUB",
    leadCardRequired: true,
    handEntryEnabled: false,
    selectedMovement: null,
    ...overrides,
  };
}

describe("EditEventDetailsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGame = baseGame();
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("prefills from the created game", () => {
    render(<EditEventDetailsPage onDone={vi.fn()} />);

    expect(screen.getByLabelText("Event Name")).toHaveValue("Monday Pairs");
    expect(screen.getByLabelText("Director Name")).toHaveValue("Jane");
    expect(screen.getByLabelText("Event Type")).toHaveValue("PAIRS");
    expect(screen.getByLabelText("Scoring")).toHaveValue("MP");
  });

  it("saves edited details, optimistically updates, and calls onDone", async () => {
    const onDone = vi.fn();
    render(<EditEventDetailsPage onDone={onDone} />);

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "Tuesday Pairs" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(mockUpdateEventDetails).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ eventName: "Tuesday Pairs" }),
      ),
    );
    expect(mockMutateGame).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "Tuesday Pairs" }),
      false,
    );
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it("blocks save with an empty event name", () => {
    render(<EditEventDetailsPage onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Event Name"), {
      target: { value: "  " },
    });
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mockUpdateEventDetails).not.toHaveBeenCalled();
  });

  it("confirms before a structural change that would clear a selected movement", async () => {
    mockGame = baseGame({ selectedMovement: '{"source":"MITCHELL"}' });
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValue(true);
    render(<EditEventDetailsPage onDone={vi.fn()} />);

    // Switch Pairs -> Teams: a structural change with a movement selected.
    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "TEAMS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(confirmSpy).toHaveBeenCalled();
    await waitFor(() =>
      expect(mockUpdateEventDetails).toHaveBeenCalledWith(
        "g1",
        expect.objectContaining({ gameType: "TEAMS" }),
      ),
    );
    // The optimistic update clears the now-invalid movement.
    expect(mockMutateGame).toHaveBeenCalledWith(
      expect.objectContaining({ selectedMovement: null }),
      false,
    );
  });

  it("aborts the save when the clear-movement confirm is declined", () => {
    mockGame = baseGame({ selectedMovement: '{"source":"MITCHELL"}' });
    vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<EditEventDetailsPage onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "TEAMS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(mockUpdateEventDetails).not.toHaveBeenCalled();
  });

  it("does not confirm when a structural change has no movement to clear", async () => {
    // selectedMovement is null (default) -> no confirm needed.
    const confirmSpy = vi.spyOn(window, "confirm");
    render(<EditEventDetailsPage onDone={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Event Type"), {
      target: { value: "TEAMS" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(confirmSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(mockUpdateEventDetails).toHaveBeenCalled());
  });
});
