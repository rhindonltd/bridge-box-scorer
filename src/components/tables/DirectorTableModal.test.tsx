import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DirectorTableModal } from "./DirectorTableModal";
import type { DirectorTable } from "./DirectorTableControls";

function player(name: string) {
  return { firstName: name, lastName: "X" } as never;
}

/** A table with both pairs seated (NS and EW), optionally stationary. */
function fullTable(overrides: Partial<DirectorTable> = {}): DirectorTable {
  return {
    tableNumber: 1,
    players: {
      N: player("North"),
      S: player("South"),
      E: player("East"),
      W: player("West"),
    },
    seats: { N: "A1NS", S: "A1NS", E: "A1EW", W: "A1EW" },
    pairSeats: { ns: "A1NS", ew: "A1EW" },
    stationary: { N: false, S: false, E: false, W: false },
    ...overrides,
  } as DirectorTable;
}

/** A table whose EW seats are empty. */
function halfEmptyTable(): DirectorTable {
  return {
    tableNumber: 2,
    players: { N: player("North"), S: player("South"), E: null, W: null },
    seats: { N: "A2NS", S: "A2NS", E: null, W: null },
    pairSeats: { ns: "A2NS", ew: "A2EW" },
    stationary: { N: false, S: false, E: false, W: false },
  } as DirectorTable;
}

describe("DirectorTableModal", () => {
  it("renders nothing when no table is provided", () => {
    render(
      <DirectorTableModal
        table={null}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows both seated pairs with their player names", () => {
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Table 1")).toBeInTheDocument();
    expect(screen.getByText("North / South")).toBeInTheDocument();
    expect(screen.getByText("East / West")).toBeInTheDocument();
    expect(screen.getByText("North X")).toBeInTheDocument();
    expect(screen.getByText("West X")).toBeInTheDocument();
  });

  it("evicts the North/South and East/West pairs from their seats", () => {
    const onEvict = vi.fn();
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={onEvict}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "Evict North / South pair" }),
    );
    expect(onEvict).toHaveBeenCalledWith("A1NS");

    fireEvent.click(
      screen.getByRole("button", { name: "Evict East / West pair" }),
    );
    expect(onEvict).toHaveBeenCalledWith("A1EW");
  });

  it("hides the stationary toggle for a non-Swiss table", () => {
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText("Stationary")).not.toBeInTheDocument();
  });

  it("keeps the stationary toggle on a Swiss table once the game has started, noting it applies from the next draw", () => {
    // The director can mark or unmark a pair at any time; after the start it
    // affects only rounds drawn from then on.
    const onToggleStationary = vi.fn();
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss
        onEvict={vi.fn()}
        onToggleStationary={onToggleStationary}
        started
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getAllByText("Stationary").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Applies to rounds drawn from now on/).length,
    ).toBeGreaterThan(0);
  });

  it("does not offer a stationary toggle on a non-Swiss table, started or not", () => {
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.queryByText("Stationary")).not.toBeInTheDocument();
  });

  it("toggles stationary for the NS and EW pairs on a Swiss table", () => {
    const onToggleStationary = vi.fn();
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss
        onEvict={vi.fn()}
        onToggleStationary={onToggleStationary}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // One "Stationary" toggle group per occupied pair. Clicking the first
    // group's "Yes" fires the NS toggle (ns=true), the second the EW toggle
    // (ns=false).
    const stationaryGroups = screen.getAllByRole("group", {
      name: "Stationary",
    });
    fireEvent.click(
      within(stationaryGroups[0]).getByRole("button", { name: "Yes" }),
    );
    expect(onToggleStationary).toHaveBeenCalledWith(1, true);
    fireEvent.click(
      within(stationaryGroups[1]).getByRole("button", { name: "Yes" }),
    );
    expect(onToggleStationary).toHaveBeenCalledWith(1, false);
  });

  it("reflects an already-stationary pair via the toggle state", () => {
    render(
      <DirectorTableModal
        table={fullTable({ stationary: { N: true, E: false } } as never)}
        isSwiss
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // The NS toggle shows "Yes" pressed; two stationary labels are shown.
    expect(screen.getAllByText("Stationary")).toHaveLength(2);
  });

  it("shows the Expected late control for an unoccupied pair and no evict button", () => {
    render(
      <DirectorTableModal
        table={halfEmptyTable()}
        isSwiss
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // The empty seat offers the "Expected late" control (pre-start) rather than
    // a bare "Empty" placeholder.
    expect(screen.queryByText("Empty")).not.toBeInTheDocument();
    expect(screen.getByText("Expected late")).toBeInTheDocument();
    // Only the occupied NS pair has an evict button.
    expect(
      screen.getByRole("button", { name: "Evict North / South pair" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Evict East / West pair" }),
    ).not.toBeInTheDocument();
  });

  it("keeps the two pair rows' controls independent when one seat is empty", () => {
    // Regression for the keyless-PairRow bug: with N/S seated and E/W empty,
    // the N/S row's "Evict pair" and the E/W row's "Expected late" toggle must
    // act only on their own pair — using one must not disturb the other.
    const onEvict = vi.fn();
    const onToggleExpectedLate = vi.fn();

    render(
      <DirectorTableModal
        table={halfEmptyTable()}
        isSwiss={false}
        onEvict={onEvict}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={onToggleExpectedLate}
        onClose={vi.fn()}
      />,
    );

    // N/S row (seated): "Evict pair" -> acts on A2NS only.
    fireEvent.click(
      screen.getByRole("button", { name: "Evict North / South pair" }),
    );
    expect(onEvict).toHaveBeenCalledWith("A2NS");
    expect(onToggleExpectedLate).not.toHaveBeenCalled();

    // E/W row (empty): "Expected late" -> acts on A2EW only.
    const expectedLate = screen.getByRole("group", { name: "Expected late" });
    fireEvent.click(within(expectedLate).getByRole("button", { name: "Yes" }));
    expect(onToggleExpectedLate).toHaveBeenCalledWith("A2EW", true);
    // The evict handler was not called a second time by the other row.
    expect(onEvict).toHaveBeenCalledTimes(1);
  });

  it("renders a placeholder dash for a missing player name", () => {
    const table = fullTable();
    (table.players as { N: unknown }).N = null;
    render(
      <DirectorTableModal
        table={table}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("closes via the Done button", () => {
    const onClose = vi.fn();
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("defaults the stationary flags to false when the table omits them", () => {
    const table = fullTable();
    delete (table as { stationary?: unknown }).stationary;
    render(
      <DirectorTableModal
        table={table}
        isSwiss
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started={false}
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // The `stationary?.N ?? false` fallbacks render the toggles in the off state.
    expect(
      screen.getAllByRole("button", { name: "No" }).length,
    ).toBeGreaterThan(0);
  });

  it("offers no handover action (handover is player-driven)", () => {
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // Handover is player-driven (Menu -> Handover on the seat's own device),
    // so the director's table dialog offers no handover control.
    expect(
      screen.queryByRole("button", { name: /over to the real pair/ }),
    ).not.toBeInTheDocument();
  });

  it("hides Change standing when standing controls are off (pairs, design §11)", () => {
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        showStandingControls={false}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("button", { name: /Change standing/ }),
    ).not.toBeInTheDocument();
  });

  describe("post-start standing controls", () => {
    function renderStarted(table: DirectorTable = fullTable()) {
      const onChangeStanding = vi.fn();
      render(
        <DirectorTableModal
          table={table}
          isSwiss={false}
          onEvict={vi.fn()}
          onToggleStationary={vi.fn()}
          started
          onChangeStanding={onChangeStanding}
          onToggleExpectedLate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      const nsRow = screen
        .getByText("North / South")
        .closest("div.rounded-xl") as HTMLElement;
      const openForm = () =>
        fireEvent.click(
          within(nsRow).getByRole("button", {
            name: "Change standing for North / South pair",
          }),
        );
      return { onChangeStanding, nsRow, openForm };
    }

    it("saves a Withdrawn standing with a round number and the REMOVE treatment", () => {
      const { onChangeStanding, nsRow, openForm } = renderStarted();
      openForm();
      fireEvent.click(within(nsRow).getByLabelText("Withdrawn"));
      expect(within(nsRow).getByText("Withdrew in round")).toBeInTheDocument();
      // Bump the round from 1 to 2.
      fireEvent.mouseDown(within(nsRow).getByRole("button", { name: "+" }));
      fireEvent.mouseUp(within(nsRow).getByRole("button", { name: "+" }));
      fireEvent.click(within(nsRow).getByRole("button", { name: "Save" }));
      expect(onChangeStanding).toHaveBeenCalledWith("A1NS", {
        standing: "WITHDRAWN",
        withdrawnInRound: 2,
        treatment: "REMOVE",
      });
      // The form closes after saving.
      expect(
        within(nsRow).getByRole("button", {
          name: "Change standing for North / South pair",
        }),
      ).toBeInTheDocument();
    });

    it("saves a Late standing with a penalised fine", () => {
      const { onChangeStanding, nsRow, openForm } = renderStarted();
      openForm();
      fireEvent.click(within(nsRow).getByLabelText("Late"));
      expect(within(nsRow).getByText("Arrived in round")).toBeInTheDocument();
      fireEvent.click(within(nsRow).getByLabelText("Penalised"));
      expect(within(nsRow).getByText("Fine %")).toBeInTheDocument();
      // Two steppers now: round (first) and fine (second). Raise the fine by 1.
      const plusButtons = within(nsRow).getAllByRole("button", { name: "+" });
      fireEvent.mouseDown(plusButtons[1]);
      fireEvent.mouseUp(plusButtons[1]);
      fireEvent.click(within(nsRow).getByRole("button", { name: "Save" }));
      expect(onChangeStanding).toHaveBeenCalledWith("A1NS", {
        standing: "LATE",
        arrivedInRound: 1,
        treatment: "PENALISED",
        finePercent: 1,
      });
    });

    it("saves a Late standing with the REMOVE treatment", () => {
      const { onChangeStanding, nsRow, openForm } = renderStarted();
      openForm();
      fireEvent.click(within(nsRow).getByLabelText("Late"));
      fireEvent.click(within(nsRow).getByRole("button", { name: "Save" }));
      expect(onChangeStanding).toHaveBeenCalledWith("A1NS", {
        standing: "LATE",
        arrivedInRound: 1,
        treatment: "REMOVE",
      });
    });

    it("saves a Withdrawn standing with a penalised fine", () => {
      const { onChangeStanding, nsRow, openForm } = renderStarted();
      openForm();
      fireEvent.click(within(nsRow).getByLabelText("Withdrawn"));
      fireEvent.click(within(nsRow).getByLabelText("Penalised"));
      fireEvent.click(within(nsRow).getByRole("button", { name: "Save" }));
      expect(onChangeStanding).toHaveBeenCalledWith("A1NS", {
        standing: "WITHDRAWN",
        withdrawnInRound: 1,
        treatment: "PENALISED",
        finePercent: 0,
      });
    });

    it("saves Without standing and Active", () => {
      const { onChangeStanding, nsRow, openForm } = renderStarted();
      openForm();
      fireEvent.click(within(nsRow).getByLabelText("No standing"));
      fireEvent.click(within(nsRow).getByRole("button", { name: "Save" }));
      expect(onChangeStanding).toHaveBeenLastCalledWith("A1NS", {
        standing: "WITHOUT_STANDING",
      });
      openForm();
      // The form opens on the pair's current standing (Active by default).
      fireEvent.click(within(nsRow).getByRole("button", { name: "Save" }));
      expect(onChangeStanding).toHaveBeenLastCalledWith("A1NS", {
        standing: "ACTIVE",
      });
    });

    it("cancels the standing editor without saving", () => {
      const { onChangeStanding, nsRow, openForm } = renderStarted();
      openForm();
      fireEvent.click(within(nsRow).getByRole("button", { name: "Cancel" }));
      expect(onChangeStanding).not.toHaveBeenCalled();
      expect(
        within(nsRow).getByRole("button", {
          name: "Change standing for North / South pair",
        }),
      ).toBeInTheDocument();
    });

    it("opens the editor on the pair's current standing and shows a badge", () => {
      const { nsRow, openForm } = renderStarted(
        fullTable({
          standing: { N: "WITHDRAWN", E: "LATE" },
        } as never),
      );
      expect(within(nsRow).getByText("Withdrawn")).toBeInTheDocument();
      expect(screen.getByText("Late")).toBeInTheDocument();
      openForm();
      expect(within(nsRow).getByLabelText("Withdrawn")).toBeChecked();
    });

    it("shows a badge for a pair without standing but none for an active pair", () => {
      renderStarted(
        fullTable({
          standing: { N: "WITHOUT_STANDING", E: "ACTIVE" },
        } as never),
      );
      expect(screen.getByText("Without standing")).toBeInTheDocument();
      expect(screen.queryByText("Active")).not.toBeInTheDocument();
    });

    it("notes an expected-late empty seat after the start", () => {
      render(
        <DirectorTableModal
          table={
            {
              ...halfEmptyTable(),
              expectedLate: { N: false, E: true },
            } as never
          }
          isSwiss={false}
          started
          onEvict={vi.fn()}
          onToggleStationary={vi.fn()}
          onChangeStanding={vi.fn()}
          onToggleExpectedLate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(
        screen.getByText("Expected late — not yet seated"),
      ).toBeInTheDocument();
    });

    it("shows nothing extra for an empty seat that is not expected late after the start", () => {
      render(
        <DirectorTableModal
          table={halfEmptyTable()}
          isSwiss={false}
          started
          onEvict={vi.fn()}
          onToggleStationary={vi.fn()}
          onChangeStanding={vi.fn()}
          onToggleExpectedLate={vi.fn()}
          onClose={vi.fn()}
        />,
      );
      expect(screen.queryByText(/Expected late/)).not.toBeInTheDocument();
    });
  });
});
