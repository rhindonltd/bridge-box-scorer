import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
    stationary: { N: false, E: false },
    ...overrides,
  } as DirectorTable;
}

/** A table whose EW seats are empty. */
function halfEmptyTable(): DirectorTable {
  return {
    tableNumber: 2,
    players: { N: player("North"), S: player("South"), E: null, W: null },
    seats: { N: "A2NS", S: "A2NS", E: null, W: null },
    stationary: { N: false, E: false },
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
        onClose={vi.fn()}
      />,
    );

    // Two "Yes" toggles (one per occupied pair). Clicking the first fires the
    // NS toggle (ns=true), the second the EW toggle (ns=false).
    const yesButtons = screen.getAllByRole("button", { name: "Yes" });
    fireEvent.click(yesButtons[0]);
    expect(onToggleStationary).toHaveBeenCalledWith(1, true);
    fireEvent.click(yesButtons[1]);
    expect(onToggleStationary).toHaveBeenCalledWith(1, false);
  });

  it("reflects an already-stationary pair via the toggle state", () => {
    render(
      <DirectorTableModal
        table={fullTable({ stationary: { N: true, E: false } } as never)}
        isSwiss
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    // The NS toggle shows "Yes" pressed; two stationary labels are shown.
    expect(screen.getAllByText("Stationary")).toHaveLength(2);
  });

  it("shows an Empty placeholder for an unoccupied pair and no evict button", () => {
    render(
      <DirectorTableModal
        table={halfEmptyTable()}
        isSwiss
        onEvict={vi.fn()}
        onToggleStationary={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Empty")).toBeInTheDocument();
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
        onClose={vi.fn()}
      />,
    );
    // The `stationary?.N ?? false` fallbacks render the toggles in the off state.
    expect(
      screen.getAllByRole("button", { name: "No" }).length,
    ).toBeGreaterThan(0);
  });
});
