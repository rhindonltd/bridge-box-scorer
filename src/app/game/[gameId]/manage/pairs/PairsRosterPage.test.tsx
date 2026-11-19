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
  onChangeStanding: vi.fn().mockResolvedValue(undefined),
  renderReinstatePanel: vi.fn((seat: string) => (
    <div data-testid={`reinstate-panel-${seat}`} />
  )),
  renderMoveDevicePanel: vi.fn((seat: string) => (
    <div data-testid={`move-panel-${seat}`} />
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

describe("PairsRosterPage stationary (Swiss)", () => {
  function renderSwiss(isStationary: boolean | null, toggle = vi.fn()) {
    const h = actions();
    render(
      <PairsRosterPage
        onBack={vi.fn()}
        roster={[{ ...active, anchorId: "A5" }]}
        isSwiss
        stationary={{
          isStationary: () => isStationary,
          toggle: toggle.mockResolvedValue(undefined),
        }}
        {...h}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    return toggle;
  }

  it("shows the toggle with the saved value and flips it on tap", async () => {
    const toggle = renderSwiss(false);
    expect(
      screen.getByRole("group", { name: "Stationary" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Applies to rounds drawn from now on/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    await waitFor(() => expect(toggle).toHaveBeenCalledTimes(1));
    expect(toggle.mock.calls[0][0]).toMatchObject({ seat: "A1NS" });
  });

  it("does nothing when the tapped value is already the saved one", () => {
    const toggle = renderSwiss(true);
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(toggle).not.toHaveBeenCalled();
  });

  it("is hidden for a pair that can't be marked", () => {
    renderSwiss(null);
    expect(
      screen.queryByRole("group", { name: "Stationary" }),
    ).not.toBeInTheDocument();
  });

  it("surfaces a save failure", async () => {
    const toggle = vi.fn().mockRejectedValue(new Error("Nope"));
    const h = actions();
    render(
      <PairsRosterPage
        onBack={vi.fn()}
        roster={[{ ...active, anchorId: "A5" }]}
        isSwiss
        stationary={{ isStationary: () => false, toggle }}
        {...h}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nope");
  });

  it("is not offered on a board-pooled Pairs game", () => {
    renderPage([active]);
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    expect(
      screen.queryByRole("group", { name: "Stationary" }),
    ).not.toBeInTheDocument();
  });
});

describe("PairsRosterPage section names", () => {
  it("shows each section's name on its pill and card, not 'Section X'", () => {
    const h = actions();
    render(
      <PairsRosterPage
        onBack={vi.fn()}
        roster={[
          active,
          { ...active, seat: "B1NS", pair: "Bea Blue & Ben Blue" },
        ]}
        sectionLabels={{ A: "Red", B: "Blue" }}
        {...h}
      />,
    );
    expect(screen.getByRole("tab", { name: "Red" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Blue" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Red" })).toBeInTheDocument();
    expect(screen.queryByText(/Section [AB]/)).not.toBeInTheDocument();
  });
});

describe("PairsRosterPage pair identity", () => {
  it("heads a seat with its movement id, not the seat it started at", () => {
    renderPage([{ ...active, seat: "A2EW", anchorId: "A4" }]);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("4");
  });

  it("falls back to the seat when the movement id is the seat itself", () => {
    renderPage([{ ...active, seat: "A2EW" }]);
    expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("2EW");
  });
});

describe("PairsRosterPage standing controls", () => {
  it("marks an active pair without standing after a confirm", async () => {
    const h = renderPage([active]);
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    fireEvent.click(
      screen.getByRole("button", { name: "Mark without standing" }),
    );
    expect(h.onChangeStanding).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(h.onChangeStanding).toHaveBeenCalledWith("A1NS", {
        standing: "WITHOUT_STANDING",
      }),
    );
  });

  it("restores a without-standing pair", async () => {
    const h = renderPage([{ ...active, status: "WITHOUT_STANDING" }]);
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    fireEvent.click(screen.getByRole("button", { name: "Restore standing" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await waitFor(() =>
      expect(h.onChangeStanding).toHaveBeenCalledWith("A1NS", {
        standing: "ACTIVE",
      }),
    );
  });

  it("Swiss: offers the standing editor, not board-pooled withdraw/absence", async () => {
    const h = actions();
    render(
      <PairsRosterPage
        onBack={vi.fn()}
        roster={[active, withdrawn]}
        isSwiss
        {...h}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    expect(
      screen.queryByRole("button", { name: "Withdraw this pair" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Change standing" }));
    fireEvent.click(screen.getByLabelText("No standing"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(h.onChangeStanding).toHaveBeenCalledWith("A1NS", {
        standing: "WITHOUT_STANDING",
      }),
    );

    // A withdrawn Swiss pair gets no AVE−/AVE+ choice or reinstate code.
    fireEvent.click(screen.getByRole("button", { name: /Wyn Gone/ }));
    expect(screen.queryByText("Missed boards")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Reinstate on a device" }),
    ).not.toBeInTheDocument();
  });
});

describe("PairsRosterPage Swiss standing editor", () => {
  function renderSwissPage(roster: RosterEntry[], over = {}) {
    const h = { ...actions(), ...over };
    render(<PairsRosterPage onBack={vi.fn()} roster={roster} isSwiss {...h} />);
    return h;
  }
  it("offers no standing controls on a seat nobody has arrived at", () => {
    renderSwissPage([
      { seat: "A4EW", pair: null, status: "NOT_ARRIVED", anchorId: "A4" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Seat not filled/ }));
    expect(
      screen.queryByRole("button", { name: "Change standing" }),
    ).not.toBeInTheDocument();
  });
  it("labels the standing editor by movement id when the seat has no pair name", () => {
    renderSwissPage([
      { seat: "A4EW", pair: null, status: "ACTIVE", anchorId: "A7" },
    ]);
    fireEvent.click(screen.getByRole("button", { name: /Seat not filled/ }));
    fireEvent.click(screen.getByRole("button", { name: "Change standing" }));
    expect(screen.getByText("Standing for 7")).toBeInTheDocument();
  });
  it("opens the editor on the pair's current non-active standing and cancels", () => {
    renderSwissPage([{ ...active, status: "WITHOUT_STANDING" }]);
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    fireEvent.click(screen.getByRole("button", { name: "Change standing" }));
    expect(screen.getByLabelText("No standing")).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.getByRole("button", { name: "Change standing" }),
    ).toBeInTheDocument();
  });
  it("keeps the editor open and shows the server's reason when saving fails", async () => {
    const h = renderSwissPage([active], {
      onChangeStanding: vi.fn().mockRejectedValue(new Error("Round closed")),
    });
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    fireEvent.click(screen.getByRole("button", { name: "Change standing" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Round closed");
    expect(h.onChangeStanding).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
  });
  it.each([
    ["an error with no message", new Error("")],
    ["a non-Error rejection", "boom"],
  ])(
    "shows a generic message when saving fails with %s",
    async (_n, reason) => {
      renderSwissPage([active], {
        onChangeStanding: vi.fn().mockRejectedValue(reason),
      });
      fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
      fireEvent.click(screen.getByRole("button", { name: "Change standing" }));
      fireEvent.click(screen.getByRole("button", { name: "Save" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not save. Please try again.",
      );
    },
  );
  it("shows a generic message when the stationary save rejects without a reason", async () => {
    const toggle = vi.fn().mockRejectedValue("boom");
    render(
      <PairsRosterPage
        onBack={vi.fn()}
        roster={[{ ...active, anchorId: "A5" }]}
        isSwiss
        stationary={{ isStationary: () => false, toggle }}
        {...actions()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save. Please try again.",
    );
  });
});
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

  it("offers 'Move to a new device' on an active pair, revealing the director's code panel", () => {
    const h = renderPage([active]);
    fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
    // Nothing is minted until the director asks.
    expect(h.renderMoveDevicePanel).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Move to a new device" }),
    );
    expect(h.renderMoveDevicePanel).toHaveBeenCalledWith("A1NS");
    expect(screen.getByTestId("move-panel-A1NS")).toBeInTheDocument();
    // Withdrawing stays available alongside it.
    expect(
      screen.getByRole("button", { name: "Withdraw this pair" }),
    ).toBeInTheDocument();
  });
  it("does not offer a device move on a withdrawn pair (reinstate covers it)", () => {
    renderPage([withdrawn]);
    fireEvent.click(screen.getByRole("button", { name: /Wyn Gone/ }));
    expect(
      screen.queryByRole("button", { name: "Move to a new device" }),
    ).not.toBeInTheDocument();
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
    expect(screen.getByRole("heading", { name: "A" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "B" })).toBeInTheDocument();
    expect(screen.getByText("Ann Active & Bob Active")).toBeInTheDocument();
    expect(screen.getByText("Grace Hill & Hugh Ives")).toBeInTheDocument();

    // Picking section B hides section A's pairs and container.
    fireEvent.click(screen.getByRole("tab", { name: "B" }));
    expect(
      screen.queryByRole("heading", { name: "A" }),
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

  describe("coverage of edge cases", () => {
    const occ = (id: number, over = {}) => ({
      id,
      pair: `Pair ${id}`,
      boardCount: 1,
      eligible: true,
      isArrivalAnchor: false,
      isMainPair: false,
      ...over,
    });
    const subWith = (occupants: any[]): RosterEntry => ({
      seat: "A5NS",
      pair: "x",
      status: "SUBSTITUTED",
      substitution: {
        seat: "A5NS",
        pair: "x",
        playedCount: 1,
        missedCount: 1,
        split: false,
        occupants,
      } as any,
    });

    it("says so when no pairs are seated", () => {
      renderPage([]);
      expect(screen.getByText("No pairs seated yet.")).toBeInTheDocument();
    });

    it("tolerates malformed seat names when grouping and sorting", () => {
      const seat = (s: string): RosterEntry => ({
        seat: s,
        pair: `Pair ${s}`,
        status: "ACTIVE",
      });
      renderPage([seat("12NS"), seat("A1XX"), seat("A1EW"), seat("ABC")]);
      expect(screen.getByText("Pair 12NS")).toBeInTheDocument();
      expect(screen.getByText("Pair ABC")).toBeInTheDocument();
      // A seat with no digits falls back to the whole seat as its label.
      expect(
        screen.getAllByRole("heading", { name: "ABC" }).length,
      ).toBeGreaterThan(0);
    });

    it("sorts seats that carry no table number", () => {
      const seat: RosterEntry = { seat: "ABC", pair: "Pat", status: "ACTIVE" };
      renderPage([seat, { ...seat, pair: "Quin" }]);
      expect(screen.getByText("Pat")).toBeInTheDocument();
      expect(screen.getByText("Quin")).toBeInTheDocument();
    });

    it("describes a without-standing pair", () => {
      renderPage([
        { seat: "A1NS", pair: "P", status: "WITHOUT_STANDING" } as RosterEntry,
      ]);
      expect(screen.getByText("Plays but is not ranked")).toBeInTheDocument();
    });

    it("cancels out of a withdraw confirmation", () => {
      const h = renderPage([active]);
      fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
      fireEvent.click(
        screen.getByRole("button", { name: "Withdraw this pair" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(h.onWithdraw).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: "Withdraw this pair" }),
      ).toBeInTheDocument();
    });

    it("falls back to a generic message when withdraw rejects without a reason", async () => {
      renderPage([active], { onWithdraw: vi.fn().mockRejectedValue("nope") });
      fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
      fireEvent.click(
        screen.getByRole("button", { name: "Withdraw this pair" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not do that. Please try again.",
      );
    });

    it("omits the move-device control on an active pair when the host cannot mint codes", () => {
      renderPage([active], { renderMoveDevicePanel: undefined });
      fireEvent.click(screen.getByRole("button", { name: /Ann Active/ }));
      expect(
        screen.queryByRole("button", { name: "Move to a new device" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Withdraw this pair" }),
      ).toBeInTheDocument();
    });

    const lateAbsence = {
      seat: "A6NS",
      kind: "LATE",
      pair: "Lara Late & Len Late",
      round: 2,
      treatment: "AVERAGE",
      missedBoards: 1,
    } as const;

    it("summarises a late pair and offers the missed-boards choice and a device move", () => {
      renderPage([
        {
          seat: "A6NS",
          pair: "Lara Late & Len Late",
          status: "LATE",
          absence: lateAbsence,
        } as RosterEntry,
      ]);
      expect(
        screen.getByText("Arrived in round 2 — 1 board missed"),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Lara Late/ }));
      expect(screen.getByText("Missed boards")).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: "Move to a new device" }),
      );
      expect(screen.getByTestId("move-panel-A6NS")).toBeInTheDocument();
    });

    it("offers only a device move to a late pair with no absence record", () => {
      renderPage([
        { seat: "A6NS", pair: "Lara", status: "LATE" } as RosterEntry,
      ]);
      fireEvent.click(screen.getByRole("button", { name: /Lara/ }));
      expect(screen.queryByText("Missed boards")).not.toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Move to a new device" }),
      ).toBeInTheDocument();
    });

    it("offers no actions to a late pair without an absence when moves are unavailable", () => {
      renderPage(
        [{ seat: "A6NS", pair: "Lara", status: "LATE" } as RosterEntry],
        { renderMoveDevicePanel: undefined },
      );
      fireEvent.click(screen.getByRole("button", { name: /Lara/ }));
      expect(screen.queryByRole("button", { name: /device/ })).toBeNull();
      expect(screen.queryByText("Missed boards")).toBeNull();
    });

    it("offers no actions to a not-arrived seat without an absence record", () => {
      renderPage([
        { seat: "A6NS", pair: "Nina", status: "NOT_ARRIVED" } as RosterEntry,
      ]);
      fireEvent.click(screen.getByRole("button", { name: /Nina/ }));
      expect(screen.queryByText("Missed boards")).toBeNull();
      expect(screen.queryByRole("button", { name: /device/ })).toBeNull();
    });

    it("does not offer a device move on a not-arrived seat with an absence", () => {
      renderPage([
        {
          seat: "A6NS",
          pair: "Nina",
          status: "NOT_ARRIVED",
          absence: { ...lateAbsence, kind: "EMPTY", round: null },
        } as RosterEntry,
      ]);
      fireEvent.click(screen.getByRole("button", { name: /Nina/ }));
      expect(screen.getByText("Missed boards")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Move to a new device" }),
      ).toBeNull();
    });

    it("uses 'board' in the singular summary for withdrawn pairs", () => {
      renderPage([
        {
          ...withdrawn,
          absence: { ...withdrawn.absence!, missedBoards: 1 },
        } as RosterEntry,
      ]);
      expect(
        screen.getByText("Withdrew in round 4 — 1 board not played"),
      ).toBeInTheDocument();
    });

    it("describes an empty seat with the unplayed board count", () => {
      renderPage([
        {
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
        } as RosterEntry,
      ]);
      expect(
        screen.getByText("Not arrived yet — 2 boards unplayed"),
      ).toBeInTheDocument();
    });

    it("explains the AVE treatment differently for an unfilled seat", () => {
      renderPage([
        {
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
        } as RosterEntry,
      ]);
      fireEvent.click(screen.getByRole("button", { name: /Seat not filled/ }));
      expect(
        screen.getByText(
          "Its opponents get AVE+ on each board they can't play.",
        ),
      ).toBeInTheDocument();
    });

    it("reverts the treatment and shows the error when saving it fails", async () => {
      const h = renderPage([withdrawn], {
        onSetAbsenceTreatment: vi
          .fn()
          .mockRejectedValue(new Error("too late to change")),
      });
      fireEvent.click(screen.getByRole("button", { name: /Wyn Gone/ }));
      fireEvent.click(screen.getByLabelText("Remove"));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "too late to change",
      );
      expect(h.onSetAbsenceTreatment).toHaveBeenCalled();
      expect(screen.getByLabelText("AVE− / AVE+")).toBeChecked();
    });

    it("shows a generic message when saving the treatment rejects without a reason", async () => {
      renderPage([withdrawn], {
        onSetAbsenceTreatment: vi.fn().mockRejectedValue("nope"),
      });
      fireEvent.click(screen.getByRole("button", { name: /Wyn Gone/ }));
      fireEvent.click(screen.getByLabelText("Remove"));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not save. Please try again.",
      );
    });

    it("shows a generic message when saving a substitution rejects without a reason", async () => {
      renderPage([subSeat], {
        onSaveSubstitution: vi.fn().mockRejectedValue("nope"),
      });
      fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
      fireEvent.click(screen.getByRole("button", { name: "Two lines" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Could not save. Please try again.",
      );
    });

    it("uses the first occupant as anchor/main when none is flagged", () => {
      renderPage([subWith([occ(1), occ(2)])]);
      fireEvent.click(screen.getByRole("button", { name: /Pair 1/ }));
      expect(screen.getByText("Main")).toBeInTheDocument();
      expect(
        screen.getByRole("radio", { name: "Make Pair 1 the main pair" }),
      ).toBeChecked();
    });

    it("uses the anchor as main when no occupant is flagged main", () => {
      renderPage([subWith([occ(1), occ(2, { isArrivalAnchor: true })])]);
      fireEvent.click(screen.getByRole("button", { name: /Pair 1/ }));
      expect(
        screen.getByRole("radio", { name: "Make Pair 2 the main pair" }),
      ).toBeChecked();
    });

    it("hides the NGS note for a teams event", () => {
      renderPage([subSeat], { isPairs: false });
      fireEvent.click(screen.getByRole("button", { name: /Carol May/ }));
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
    });

    it("hides the NGS note and shows a single occupant's board count in the singular", () => {
      renderPage([subWith([occ(1, { isArrivalAnchor: true })])]);
      fireEvent.click(screen.getByRole("button", { name: /Pair 1/ }));
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
      expect(screen.getByText(/— 1 board$/)).toBeInTheDocument();
    });
  });
});
