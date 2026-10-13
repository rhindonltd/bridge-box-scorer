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
        onHandover={vi.fn()}
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
        onHandover={vi.fn()}
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
        onHandover={vi.fn()}
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
        onHandover={vi.fn()}
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
        onHandover={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // One "Stationary" toggle group per occupied pair (each row also has a
    // separate "Without standing" toggle, so scope to the Stationary groups).
    // Clicking the first group's "Yes" fires the NS toggle (ns=true), the
    // second the EW toggle (ns=false).
    const stationaryGroups = screen.getAllByRole("group", {
      name: "Stationary",
    });
    fireEvent.click(within(stationaryGroups[0]).getByRole("button", { name: "Yes" }));
    expect(onToggleStationary).toHaveBeenCalledWith(1, true);
    fireEvent.click(within(stationaryGroups[1]).getByRole("button", { name: "Yes" }));
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
        onHandover={vi.fn()}
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
        onHandover={vi.fn()}
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
        onHandover={vi.fn()}
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
        onHandover={vi.fn()}
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
        onHandover={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // The `stationary?.N ?? false` fallbacks render the toggles in the off state.
    expect(
      screen.getAllByRole("button", { name: "No" }).length,
    ).toBeGreaterThan(0);
  });

  it("offers a handover action for a seated pair once the game has started", () => {
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onHandover={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Hand North / South over to the real pair" }),
    ).toBeInTheDocument();
  });

  it("emits a handover request with the arriving pair's names and treatment", () => {
    const onHandover = vi.fn();
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onHandover={onHandover}
        onClose={vi.fn()}
      />,
    );

    // Open the North/South handover form.
    fireEvent.click(
      screen.getByRole("button", {
        name: "Hand North / South over to the real pair",
      }),
    );

    fireEvent.change(screen.getByLabelText("Player 1 first name"), {
      target: { value: "Ann" },
    });
    fireEvent.change(screen.getByLabelText("Player 1 surname"), {
      target: { value: "Arrival" },
    });
    fireEvent.change(screen.getByLabelText("Player 2 first name"), {
      target: { value: "Ben" },
    });
    fireEvent.change(screen.getByLabelText("Player 2 surname"), {
      target: { value: "Berry" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Hand over" }));

    expect(onHandover).toHaveBeenCalledWith("A1NS", {
      player1: { firstName: "Ann", lastName: "Arrival" },
      player2: { firstName: "Ben", lastName: "Berry" },
      treatment: "PENALISED",
      finePercent: 0,
    });
  });

  it("disables the handover until both arriving players have a surname", () => {
    render(
      <DirectorTableModal
        table={fullTable()}
        isSwiss={false}
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        started
        onChangeStanding={vi.fn()}
        onToggleExpectedLate={vi.fn()}
        onHandover={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Hand North / South over to the real pair",
      }),
    );

    const submit = screen.getByRole("button", { name: "Hand over" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Player 1 surname"), {
      target: { value: "Only" },
    });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Player 2 surname"), {
      target: { value: "Both" },
    });
    expect(submit).toBeEnabled();
  });
});
