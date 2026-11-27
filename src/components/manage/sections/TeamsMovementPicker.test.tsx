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
  setSectionThurnerTeamsMovement: vi.fn(),
  setSectionStaggerTeamsMovement: vi.fn(),
  setSectionHeadToHeadTeamsMovement: vi.fn(),
}));

import {
  setSectionAmericanWhistTeamsMovement,
  setSectionCirculationTeamsMovement,
  setSectionThurnerTeamsMovement,
  setSectionStaggerTeamsMovement,
  setSectionHeadToHeadTeamsMovement,
  setSectionTeamsMovementSpec,
} from "@/lib/section-service";
import { TeamsMovementPicker } from "./TeamsMovementPicker";
import type { SelectedMovement } from "@/model/selected-movement";

const stagger = {
  id: 3,
  name: "Stagger",
  tables: 10,
  boards: 40,
  boardsPerRound: 8,
  rounds: 5,
};
const short = { ...stagger, id: 4, name: "Short", boardsPerRound: 4 };

// Twenty teams: no generated movement suits, so only the library is listed.
function renderPicker(onSelected = vi.fn()) {
  render(
    <TeamsMovementPicker
      gameId="g1"
      section="A"
      tables={20}
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
    swrData.set("/api/movements/teams/20", [stagger, short]);
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
    swrData.set("/api/movements/teams/20", []);
    renderPicker();
    expect(
      screen.getByText("No teams movements are available for 20 tables."),
    ).toBeTruthy();
  });

  it("shows nothing while the list is loading", () => {
    swrData.delete("/api/movements/teams/20");
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
      screen.getAllByRole("button", { name: /All Play All/ })[0],
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
      ).toEqual(
        expect.arrayContaining(["12 boards", "24 boards", "36 boards"]),
      );
      expect(
        screen.getAllByRole("button", { name: /Circulation/ }),
      ).toHaveLength(3);
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
  describe("eight teams", () => {
    it("offers Thurner, marks the selected one and saves a choice", async () => {
      swrData.set("/api/movements/teams/8", []);
      const onSelected = vi.fn();
      render(
        <TeamsMovementPicker
          gameId="g1"
          section="A"
          tables={8}
          selectedMovement={{
            source: "THURNER_TEAMS",
            thurnerTeams: { teams: 8, boardsPerRound: 3 },
          }}
          onSelected={onSelected}
        />,
      );
      // Thurner and Stagger share the 7-round boards-per-round options.
      expect(
        screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
      ).toEqual(["14 boards", "21 boards", "28 boards", "35 boards"]);
      const selected = screen
        .getAllByTestId("teams-movement-card")
        .filter((c) => c.getAttribute("data-selected") === "true");
      expect(selected).toHaveLength(1);
      expect(selected[0].textContent).toContain("21");
      fireEvent.click(screen.getAllByRole("button", { name: /Thurner/ })[0]);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Select Movement" }));
      await waitFor(() => expect(onSelected).toHaveBeenCalled());
      expect(setSectionThurnerTeamsMovement).toHaveBeenCalledWith("g1", "A", {
        teams: 8,
        boardsPerRound: 2,
      });
    });
  });
  describe("Stagger", () => {
    it("marks a selected Stagger and saves a choice", async () => {
      swrData.set("/api/movements/teams/10", []);
      const onSelected = vi.fn();
      render(
        <TeamsMovementPicker
          gameId="g1"
          section="A"
          tables={10}
          selectedMovement={{
            source: "STAGGER_TEAMS",
            staggerTeams: { teams: 10, boardsPerRound: 3 },
          }}
          onSelected={onSelected}
        />,
      );
      // 10 teams play 9 rounds: 2..4 boards a round.
      expect(
        screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
      ).toEqual(["18 boards", "27 boards", "36 boards"]);
      const selected = screen
        .getAllByTestId("teams-movement-card")
        .filter((c) => c.getAttribute("data-selected") === "true");
      expect(selected).toHaveLength(1);
      // 3 boards a round over 10 board sets: 30 boards in play.
      expect(selected[0].textContent).toContain("30Boards in Play");
      fireEvent.click(screen.getAllByRole("button", { name: /Stagger/ })[0]);
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Select Movement" }));
      await waitFor(() => expect(onSelected).toHaveBeenCalled());
      expect(setSectionStaggerTeamsMovement).toHaveBeenCalledWith("g1", "A", {
        teams: 10,
        boardsPerRound: 2,
      });
    });
  });
  describe("Head to Head", () => {
    it("offers it for two teams, marks the selected one and saves a choice", async () => {
      swrData.set("/api/movements/teams/2", []);
      const onSelected = vi.fn();
      render(
        <TeamsMovementPicker
          gameId="g1"
          section="A"
          tables={2}
          selectedMovement={{
            source: "HEAD_TO_HEAD_TEAMS",
            headToHeadTeams: { boardsPerRound: 12 },
          }}
          onSelected={onSelected}
        />,
      );
      expect(
        screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
      ).toEqual(["12 boards", "16 boards", "20 boards", "24 boards"]);
      const selected = screen
        .getAllByTestId("teams-movement-card")
        .filter((c) => c.getAttribute("data-selected") === "true");
      expect(selected).toHaveLength(1);
      expect(selected[0].textContent).toContain("24Boards in Play");
      fireEvent.click(
        screen.getAllByRole("button", { name: /Head to Head/ })[0],
      );
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Select Movement" }));
      await waitFor(() => expect(onSelected).toHaveBeenCalled());
      expect(setSectionHeadToHeadTeamsMovement).toHaveBeenCalledWith(
        "g1",
        "A",
        { boardsPerRound: 6 },
      );
    });
  });
});
