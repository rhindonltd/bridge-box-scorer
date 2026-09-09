import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DirectorTableControls, {
  type DirectorTable,
} from "./DirectorTableControls";
import type { Player } from "@/db/games/tables/players";
import type { Seat } from "@/model/participants";

function player(firstName: string): Player {
  return { id: 1, firstName, lastName: "Test", nationalId: null };
}

function tables(): DirectorTable[] {
  return [
    {
      tableNumber: 1,
      players: {
        // North: present with a seat -> evict button shown.
        N: player("Ada"),
        // South: present but no seat -> no evict button.
        S: player("Bob"),
        // East: absent -> no evict button.
        E: null,
        W: null,
      },
      seats: {
        N: "A1NS" as Seat,
        S: null,
        E: null,
        W: null,
      },
    },
  ];
}

describe("DirectorTableControls", () => {
  it("renders a table with its number and occupied players", () => {
    render(
      <DirectorTableControls
        tables={tables()}
        onEvict={vi.fn()}
        canRemoveTable={false}
      />,
    );

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("shows an evict button only for a player that has a seat, and evicts", () => {
    const onEvict = vi.fn();
    render(
      <DirectorTableControls
        tables={tables()}
        onEvict={onEvict}
        canRemoveTable
      />,
    );

    // North has a player + seat -> evict button present.
    const evictNorth = screen.getByRole("button", {
      name: "Evict North player",
    });
    // South has a player but no seat -> no evict button.
    expect(
      screen.queryByRole("button", { name: "Evict South player" }),
    ).not.toBeInTheDocument();
    // East is empty -> no evict button.
    expect(
      screen.queryByRole("button", { name: "Evict East player" }),
    ).not.toBeInTheDocument();

    fireEvent.click(evictNorth);
    expect(onEvict).toHaveBeenCalledWith("A1NS");
  });

  it("marks stationary positions with a Stationary badge (even when empty)", () => {
    const withStationary: DirectorTable[] = [
      {
        ...tables()[0],
        // NS is stationary here (North + South); EW is not.
        stationary: { N: true, S: true, E: false, W: false },
      },
    ];

    render(
      <DirectorTableControls
        tables={withStationary}
        onEvict={vi.fn()}
        canRemoveTable={false}
      />,
    );

    // North (occupied) and South (occupied) are stationary -> two badges.
    // East is empty but not stationary -> no badge there.
    expect(screen.getAllByText("Stationary")).toHaveLength(2);
  });

  it("shows a Stationary badge on an empty stationary seat", () => {
    const withStationary: DirectorTable[] = [
      {
        tableNumber: 1,
        players: { N: null, S: null, E: null, W: null },
        seats: { N: null, S: null, E: null, W: null },
        stationary: { N: true, S: true, E: false, W: false },
      },
    ];

    render(
      <DirectorTableControls
        tables={withStationary}
        onEvict={vi.fn()}
        canRemoveTable={false}
      />,
    );

    // Both NS compass positions show the badge despite being unoccupied.
    expect(screen.getAllByText("Stationary")).toHaveLength(2);
  });

  it("renders no Stationary badge when no stationary info is provided", () => {
    render(
      <DirectorTableControls
        tables={tables()}
        onEvict={vi.fn()}
        canRemoveTable={false}
      />,
    );

    expect(screen.queryByText("Stationary")).not.toBeInTheDocument();
  });
});
