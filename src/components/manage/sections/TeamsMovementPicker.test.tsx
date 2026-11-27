import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const swrData = new Map<string, unknown>();
vi.mock("swr", () => ({
  default: (key: string | null) => ({
    data: key == null ? undefined : swrData.get(key),
  }),
}));
vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));
vi.mock("@/lib/section-service", () => ({
  setSectionTeamsMovementSpec: vi.fn(),
  setSectionAmericanWhistTeamsMovement: vi.fn(),
  setSectionCirculationTeamsMovement: vi.fn(),
}));

import {
  setSectionAmericanWhistTeamsMovement,
  setSectionCirculationTeamsMovement,
  setSectionTeamsMovementSpec,
} from "@/lib/section-service";
import { TeamsMovementPicker } from "./TeamsMovementPicker";
import type { SelectedMovement } from "@/model/selected-movement";

const stagger = {
  id: 3,
  name: "Stagger",
  tables: 6,
  boards: 40,
  boardsPerRound: 8,
  rounds: 5,
};
const short = { ...stagger, id: 4, name: "Short", boardsPerRound: 4 };

function renderPicker(onSelected = vi.fn()) {
  render(
    <TeamsMovementPicker
      gameId="g1"
      section="A"
      tables={6}
      selectedMovement={{ source: "TEAMS_SPEC", specId: 3, boardsPerRound: 8 }}
      onSelected={onSelected}
    />,
  );
  return onSelected;
}

describe("TeamsMovementPicker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrData.clear();
    swrData.set("/api/movements/teams/6", [stagger, short]);
    swrData.set("/api/movements/teams/detail/3", {
      name: "Stagger",
      tables: [
        {
          tableNumber: 1,
          rounds: [
            { roundNumber: 1, ns: "1", ew: "6", boardStart: 1, boardEnd: 8 },
          ],
        },
      ],
    });
  });

  it("groups the library's movements by boards per team and marks the selection", () => {
    renderPicker();
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["20 boards", "40 boards"]);
    const cards = screen.getAllByTestId("teams-movement-card");
    expect(cards.map((c) => c.getAttribute("data-selected"))).toEqual([
      "false",
      "true",
    ]);
  });

  it("previews a movement and saves it on Select Movement", async () => {
    const onSelected = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: /Stagger/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Select Movement" }),
    );
    await waitFor(() => expect(onSelected).toHaveBeenCalled());
    expect(setSectionTeamsMovementSpec).toHaveBeenCalledWith("g1", "A", 3, 8);
  });

  it("closes the preview without saving", async () => {
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: /Stagger/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Close" }));
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "Select Movement" }),
      ).toBeNull(),
    );
    expect(setSectionTeamsMovementSpec).not.toHaveBeenCalled();
  });

  it("alerts and keeps the preview open when saving fails", async () => {
    vi.mocked(setSectionTeamsMovementSpec).mockRejectedValue(new Error("nope"));
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
    const onSelected = renderPicker();
    fireEvent.click(screen.getByRole("button", { name: /Stagger/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Select Movement" }),
    );
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("nope"));
    expect(onSelected).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("keeps the preview open while a save is in flight", async () => {
    vi.mocked(setSectionTeamsMovementSpec).mockReturnValueOnce(
      new Promise(() => {}),
    );
    renderPicker();
    fireEvent.click(screen.getByRole("button", { name: /Stagger/ }));
    fireEvent.click(
      await screen.findByRole("button", { name: "Select Movement" }),
    );
    expect(await screen.findByRole("button", { name: "Close" })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("says so when the library has nothing for the team count", () => {
    swrData.set("/api/movements/teams/6", []);
    renderPicker();
    expect(
      screen.getByText("No teams movements are available for 6 tables."),
    ).toBeTruthy();
  });

  it("shows nothing while the list is loading", () => {
    swrData.delete("/api/movements/teams/6");
    renderPicker();
    expect(screen.queryByTestId("teams-movement-card")).toBeNull();
    expect(screen.queryByText(/No teams movements/)).toBeNull();
  });
});

describe("TeamsMovementPicker — American Whist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrData.clear();
    swrData.set("/api/movements/teams/3", []);
  });

  function renderOdd(selectedMovement: SelectedMovement | null = null) {
    const onSelected = vi.fn();
    render(
      <TeamsMovementPicker
        gameId="g1"
        section="A"
        tables={3}
        selectedMovement={selectedMovement}
        onSelected={onSelected}
      />,
    );
    return onSelected;
  }

  it("offers American Whist for an odd field, one card per boards per round", () => {
    renderOdd({
      source: "AMERICAN_WHIST_TEAMS",
      americanWhistTeams: { teams: 3, boardsPerRound: 8 },
    });
    // 3 teams play 2 rounds: 6..12 boards a round.
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual([
      "12 boards",
      "14 boards",
      "16 boards",
      "18 boards",
      "20 boards",
      "22 boards",
      "24 boards",
    ]);
    const selected = screen
      .getAllByTestId("teams-movement-card")
      .filter((c) => c.getAttribute("data-selected") === "true");
    expect(selected).toHaveLength(1);
    expect(selected[0].textContent).toContain("8");
  });

  it("previews American Whist without fetching and saves its setup", async () => {
    const onSelected = renderOdd();
    fireEvent.click(
      screen.getAllByRole("button", { name: /American Whist/ })[0],
    );
    // Table 1, round 1: team 1 at home to team 3.
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Select Movement" }));
    await waitFor(() => expect(onSelected).toHaveBeenCalled());
    expect(setSectionAmericanWhistTeamsMovement).toHaveBeenCalledWith(
      "g1",
      "A",
      { teams: 3, boardsPerRound: 6 },
    );
    expect(setSectionTeamsMovementSpec).not.toHaveBeenCalled();
  });
  describe("four teams", () => {
    function renderFour(selectedMovement: SelectedMovement | null = null) {
      swrData.set("/api/movements/teams/4", []);
      const onSelected = vi.fn();
      render(
        <TeamsMovementPicker
          gameId="g1"
          section="A"
          tables={4}
          selectedMovement={selectedMovement}
          onSelected={onSelected}
        />,
      );
      return onSelected;
    }
    it("offers Circulation at 12, 24 and 36 boards and marks the selected one", () => {
      renderFour({
        source: "CIRCULATION_TEAMS",
        circulationTeams: { boardsPerRound: 8 },
      });
      expect(
        screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
      ).toEqual(["12 boards", "24 boards", "36 boards"]);
      const selected = screen
        .getAllByTestId("teams-movement-card")
        .filter((c) => c.getAttribute("data-selected") === "true");
      expect(selected).toHaveLength(1);
      expect(selected[0].textContent).toContain("24");
    });
    it("previews a Circulation without fetching and saves its setup", async () => {
      const onSelected = renderFour();
      fireEvent.click(
        screen.getAllByRole("button", { name: /Circulation/ })[1],
      );
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Select Movement" }));
      await waitFor(() => expect(onSelected).toHaveBeenCalled());
      expect(setSectionCirculationTeamsMovement).toHaveBeenCalledWith(
        "g1",
        "A",
        { boardsPerRound: 8 },
      );
    });
  });
});
