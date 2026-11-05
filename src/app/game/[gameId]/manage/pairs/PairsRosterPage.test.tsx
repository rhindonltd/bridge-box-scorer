import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

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

import { PairsRosterPage } from "./PairsRosterPage";
import type { RosterEntry } from "@/db/games/queries/find-game-roster";

const actions = () => ({
  onSaveSubstitution: vi.fn().mockResolvedValue(undefined),
  onSetAbsenceTreatment: vi.fn().mockResolvedValue(undefined),
  onWithdraw: vi.fn().mockResolvedValue(undefined),
  renderReinstatePanel: vi.fn((seat: string) => (
    <div data-testid={`reinstate-panel-${seat}`} />
  )),
});

const active: RosterEntry = {
  seat: "A1NS",
  pair: "Ann Active & Bob Active",
  status: "ACTIVE",
};
const withdrawn: RosterEntry = {
  seat: "A2EW",
  pair: "Wyn Gone & Wes Gone",
  status: "WITHDRAWN",
  absence: {
    seat: "A2EW",
    kind: "WITHDRAWN",
    pair: "Wyn Gone & Wes Gone",
    round: 4,
    treatment: "AVERAGE",
    missedBoards: 3,
  },
};

function renderPage(roster: RosterEntry[], over = {}) {
  const handlers = { ...actions(), ...over };
  render(<PairsRosterPage onBack={vi.fn()} roster={roster} {...handlers} />);
  return handlers;
}

describe("PairsRosterPage", () => {
  it("is titled Pairs and lists every pair with its status", () => {
    renderPage([active, withdrawn]);
    expect(screen.getByRole("heading", { name: "Pairs" })).toBeInTheDocument();
    expect(screen.getByText("Ann Active & Bob Active")).toBeInTheDocument();
    expect(screen.getByText("Wyn Gone & Wes Gone")).toBeInTheDocument();
    // Every seat carries a status badge on its top strip — the withdrawn pair
    // shows "Withdrawn", the active one a green "Active".
    expect(screen.getByText("Withdrawn")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("offers Withdraw on an active pair and confirms before acting", async () => {
    const h = renderPage([active]);
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    fireEvent.click(screen.getByRole("button", { name: "Withdraw this pair" }));
    // A confirm step guards the tap.
    expect(h.onWithdraw).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() => expect(h.onWithdraw).toHaveBeenCalledWith("A1NS"));
  });

  it("offers the AVE/Removed choice and Reinstate on a withdrawn pair", async () => {
    const h = renderPage([withdrawn]);
    fireEvent.click(screen.getByRole("button", { name: /Wyn Gone/ }));
    // The missed-boards choice saves immediately.
    fireEvent.click(screen.getByLabelText("Remove"));
    await waitFor(() =>
      expect(h.onSetAbsenceTreatment).toHaveBeenCalledWith("A2EW", "REMOVED"),
    );
    // Reinstating reveals the returning device's code panel, not a one-tap
    // server action.
    fireEvent.click(
      screen.getByRole("button", { name: "Reinstate on a device" }),
    );
    expect(h.renderReinstatePanel).toHaveBeenCalledWith("A2EW");
    expect(screen.getByTestId("reinstate-panel-A2EW")).toBeInTheDocument();
  });

  it("surfaces the server's reason when an action fails", async () => {
    renderPage([active], {
      onWithdraw: vi.fn().mockRejectedValue(new Error("nothing left to play")),
    });
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    fireEvent.click(screen.getByRole("button", { name: "Withdraw this pair" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "nothing left to play",
    );
  });

  it("opens a substituted seat's split / eligibility controls", () => {
    const sub: RosterEntry = {
      seat: "A3NS",
      pair: "Carol May & Dan Fox",
      status: "SUBSTITUTED",
      substitution: {
        seat: "A3NS",
        pair: "Carol May & Dan Fox",
        playedCount: 14,
        missedCount: 10,
        split: false,
        occupants: [
          {
            id: 2,
            pair: "Carol May & Dan Fox",
            boardCount: 14,
            eligible: true,
            isArrivalAnchor: true,
            isMainPair: true,
          },
          {
            id: 1,
            pair: "Early One & Early Two",
            boardCount: 10,
            eligible: true,
            isArrivalAnchor: false,
            isMainPair: false,
          },
        ],
      },
    };
    renderPage([sub]);
    fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
    expect(screen.getByText("Split by board?")).toBeInTheDocument();
    // Changes auto-save, so there is no Save button.
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
  });

  const subSeat: RosterEntry = {
    seat: "A3NS",
    pair: "Carol May & Dan Fox",
    status: "SUBSTITUTED",
    substitution: {
      seat: "A3NS",
      pair: "Carol May & Dan Fox",
      playedCount: 14,
      missedCount: 10,
      split: false,
      occupants: [
        {
          id: 2,
          pair: "Carol May & Dan Fox",
          boardCount: 14,
          eligible: true,
          isArrivalAnchor: true,
          isMainPair: true,
        },
        {
          id: 1,
          pair: "Early One & Early Two",
          boardCount: 10,
          eligible: true,
          isArrivalAnchor: false,
          isMainPair: false,
        },
      ],
    },
  };

  it("names both pairs in the collapsed substitution header", () => {
    renderPage([subSeat]);
    // Before expanding, the row header already lists BOTH pairs that sat the
    // seat (not just the anchor).
    const header = screen.getByRole("button", { name: /Carol May/ });
    expect(header).toHaveTextContent("Carol May & Dan Fox");
    expect(header).toHaveTextContent("Early One & Early Two");
  });

  it("shows both pairs with a Main badge on the main pair", () => {
    renderPage([subSeat]);
    fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
    // Both the original and the later pair are listed. The anchor also appears
    // in the collapsed row header, so it shows twice; the sub only in the card.
    expect(screen.getAllByText("Carol May & Dan Fox").length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText("Early One & Early Two").length).toBeGreaterThan(
      0,
    );
    // The anchor (id 2) carries the "Main" badge by default.
    expect(screen.getByText("Main")).toBeInTheDocument();
  });

  it("moves Main to the other pair when its radio is picked", () => {
    renderPage([subSeat]);
    fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
    // Pick the earlier pair as the main pair.
    fireEvent.click(
      screen.getByRole("radio", {
        name: "Make Early One & Early Two the main pair",
      }),
    );
    // The NGS note names the new main / sub pick.
    expect(
      screen.getByText(/gets no NGS\/Masterpoint credit/),
    ).toHaveTextContent("Carol May & Dan Fox");
  });

  it("hides the Main pair radios when the seat is split into two lines", () => {
    renderPage([subSeat]);
    fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    // Flip Split on (the split Toggle's "Two lines" button).
    fireEvent.click(screen.getByRole("button", { name: "Two lines" }));
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    // No Main badge when there is no single main pair.
    expect(screen.queryByText("Main")).not.toBeInTheDocument();
  });

  it("auto-saves merged main pair + per-pair eligibility on change", async () => {
    const h = renderPage([subSeat]);
    fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
    // Each pair has its own "Eligible for local ranking?" toggle (a group of
    // No/Yes buttons). Mark the earlier (sub) pair not eligible: its group is
    // the second one. The change saves immediately — no Save button.
    const eligGroups = screen.getAllByRole("group", {
      name: "Eligible for local ranking?",
    });
    fireEvent.click(within(eligGroups[1]).getByRole("button", { name: "No" }));
    await waitFor(() =>
      expect(h.onSaveSubstitution).toHaveBeenCalledWith("A3NS", {
        split: false,
        mainOccupancyId: 2,
        eligibility: [
          { id: 2, eligible: true },
          { id: 1, eligible: false },
        ],
      }),
    );
  });

  it("auto-saves when the split toggle is flipped", async () => {
    const h = renderPage([subSeat]);
    fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
    fireEvent.click(screen.getByRole("button", { name: "Two lines" }));
    await waitFor(() =>
      expect(h.onSaveSubstitution).toHaveBeenCalledWith(
        "A3NS",
        expect.objectContaining({ split: true }),
      ),
    );
  });

  it("rolls back the change and shows the error when a save fails", async () => {
    renderPage([subSeat], {
      onSaveSubstitution: vi
        .fn()
        .mockRejectedValue(new Error("seat already settled")),
    });
    fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
    // Flip Split on; the save rejects, so it reverts to "One line".
    fireEvent.click(screen.getByRole("button", { name: "Two lines" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "seat already settled",
    );
    // The Main pair radios are back (split reverted to one merged line).
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("collapses a row when tapped again", () => {
    renderPage([active]);
    const header = screen.getByRole("button", { name: /Ann Active/ });
    fireEvent.click(header);
    expect(
      screen.getByRole("button", { name: "Withdraw this pair" }),
    ).toBeInTheDocument();
    fireEvent.click(header);
    expect(
      screen.queryByRole("button", { name: "Withdraw this pair" }),
    ).not.toBeInTheDocument();
  });

  it("shows no section pills for a single-section game", () => {
    renderPage([active, withdrawn]);
    expect(
      screen.queryByRole("tablist", { name: "Section" }),
    ).not.toBeInTheDocument();
  });

  it("wraps each seat in a container headed by its within-section label", () => {
    renderPage([active, withdrawn]);
    // The seat heading drops the section letter: "A1NS" -> "1NS", "A2EW" -> "2EW".
    expect(screen.getByRole("heading", { name: "1NS" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2EW" })).toBeInTheDocument();
  });

  it("orders the seat containers by seat, not by the input order", () => {
    // Arrives attention-first / out of order (and 10NS before 2NS lexically) to
    // prove the page sorts by table number then direction.
    const seat = (s: string): RosterEntry => ({
      seat: s,
      pair: `Pair ${s}`,
      status: "ACTIVE",
    });
    renderPage([seat("A10NS"), seat("A2EW"), seat("A2NS"), seat("A1NS")]);
    const headings = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(headings).toEqual(["1NS", "2NS", "2EW", "10NS"]);
  });

  it("groups pairs into per-section containers and filters by the pills", () => {
    const sectionB: RosterEntry = {
      seat: "B1NS",
      pair: "Grace Hill & Hugh Ives",
      status: "ACTIVE",
    };
    renderPage([active, sectionB]);

    // Both sections visible under "All" (the default), each in its own
    // container headed by the section letter.
    expect(
      screen.getByRole("heading", { name: "Section A" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Section B" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Ann Active & Bob Active")).toBeInTheDocument();
    expect(screen.getByText("Grace Hill & Hugh Ives")).toBeInTheDocument();

    // Picking Section B hides section A's pairs and container.
    fireEvent.click(screen.getByRole("tab", { name: "Section B" }));
    expect(
      screen.queryByRole("heading", { name: "Section A" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Ann Active & Bob Active"),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Grace Hill & Hugh Ives")).toBeInTheDocument();
  });

  it("names an unfilled expected-late seat", () => {
    const empty: RosterEntry = {
      seat: "A4EW",
      pair: null,
      status: "NOT_ARRIVED",
      absence: {
        seat: "A4EW",
        kind: "EMPTY",
        pair: null,
        round: null,
        treatment: "AVERAGE",
        missedBoards: 2,
      },
    };
    renderPage([empty]);
    expect(screen.getByText("Seat not filled")).toBeInTheDocument();
    expect(screen.getByText("Not arrived")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Seat not filled/ }));
    expect(
      within(
        screen.getByRole("group", { name: /Missed boards for/ }),
      ).getByText("Remove"),
    ).toBeInTheDocument();
  });
});
