import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

import { TeamsRosterPage } from "./TeamsRosterPage";
import type { TeamRosterEntry } from "@/db/games/queries/find-teams-roster";

function team(over: Partial<TeamRosterEntry> = {}): TeamRosterEntry {
  return {
    teamId: "A1NS",
    name: "Smith",
    section: "A",
    number: "1",
    status: "ACTIVE",
    round: null,
    treatment: null,
    seats: [
      {
        seat: "A1NS",
        label: "Home",
        occupants: [{ pair: "Ann Smith & Bob Smith", boardCount: null }],
      },
      {
        seat: "A1EW",
        label: "Away",
        occupants: [{ pair: "Cy Jones & Di Jones", boardCount: null }],
      },
    ],
    pairsUsed: 2,
    maxPairs: 3,
    ...over,
  };
}

function renderPage(roster: TeamRosterEntry[]) {
  const onChangeStanding = vi.fn().mockResolvedValue(undefined);
  const renderMoveDevicePanel = vi.fn((seat: string) => (
    <div data-testid={`move-${seat}`} />
  ));
  render(
    <TeamsRosterPage
      onBack={vi.fn()}
      roster={roster}
      onChangeStanding={onChangeStanding}
      renderMoveDevicePanel={renderMoveDevicePanel}
    />,
  );
  return { onChangeStanding };
}

describe("TeamsRosterPage", () => {
  it("is titled Teams and lists each team by number, name and status", () => {
    renderPage([team(), team({ teamId: "A2NS", number: "2", name: "Brown" })]);
    expect(screen.getByRole("heading", { name: "Teams" })).toBeInTheDocument();
    expect(screen.getByText("Team 1")).toBeInTheDocument();
    expect(screen.getByText("Team 2")).toBeInTheDocument();
    expect(screen.getByText("Smith")).toBeInTheDocument();
    expect(screen.getAllByText("Active")).toHaveLength(2);
  });

  it("shows an empty message when no teams are seated", () => {
    renderPage([]);
    expect(screen.getByText("No teams seated yet.")).toBeInTheDocument();
  });

  it("describes a withdrawn team's round", () => {
    renderPage([team({ status: "WITHDRAWN", round: 3 })]);
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
    expect(screen.getByText("Withdrew in round 3")).toBeInTheDocument();
  });

  it("groups by section with pills when there are several", () => {
    renderPage([
      team(),
      team({ teamId: "B1NS", section: "B", number: "1", name: "Green" }),
    ]);
    expect(screen.getByRole("tab", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "B" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(screen.getByText("Green")).toBeInTheDocument();
    expect(screen.queryByText("Smith")).not.toBeInTheDocument();
  });

  it("names the section pills and cards by the section's name", () => {
    const onChangeStanding = vi.fn();
    render(
      <TeamsRosterPage
        onBack={vi.fn()}
        roster={[
          team(),
          team({ teamId: "B1NS", section: "B", number: "1", name: "Green" }),
        ]}
        sectionLabels={{ A: "Red", B: "Blue" }}
        onChangeStanding={onChangeStanding}
      />,
    );
    expect(screen.getByRole("tab", { name: "Red" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Blue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Red" })).toBeInTheDocument();
  });

  it("sends a standing change to the team's home NS seat", async () => {
    const { onChangeStanding } = renderPage([team()]);
    fireEvent.click(screen.getByRole("button", { name: /Smith/ }));
    fireEvent.click(screen.getByRole("button", { name: "Change standing" }));
    fireEvent.click(screen.getByLabelText("No standing"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onChangeStanding).toHaveBeenCalledWith("A1NS", {
        standing: "WITHOUT_STANDING",
      }),
    );
  });

  it("shows who sat each seat and how many of the allowed pairs are used", () => {
    renderPage([
      team({
        pairsUsed: 3,
        seats: [
          {
            seat: "A1NS",
            label: "Home",
            occupants: [
              { pair: "Ann Smith & Bob Smith", boardCount: 8 },
              { pair: "Eve Sub & Fay Sub", boardCount: 4 },
            ],
          },
          {
            seat: "A1EW",
            label: "Away",
            occupants: [{ pair: "Cy Jones & Di Jones", boardCount: null }],
          },
        ],
      }),
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Smith/ }));
    expect(screen.getByText(/3 of 3 pairs used/)).toBeInTheDocument();
    expect(screen.getByText("Eve Sub & Fay Sub")).toBeInTheDocument();
    expect(screen.getByText("(4 boards)")).toBeInTheDocument();
  });

  it("offers a device move for each filled seat", () => {
    renderPage([team()]);
    fireEvent.click(screen.getByRole("button", { name: /Smith/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Move away pair to a new device" }),
    );
    expect(screen.getByTestId("move-A1EW")).toBeInTheDocument();
  });
});
