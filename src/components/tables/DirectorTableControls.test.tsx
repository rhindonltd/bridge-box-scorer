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
        N: player("Ada"),
        S: player("Bob"),
        E: null,
        W: null,
      },
      seats: {
        N: "A1NS" as Seat,
        S: "A1NS" as Seat,
        E: null,
        W: null,
      },
    },
  ];
}

describe("DirectorTableControls", () => {
  it("renders a table with its number and occupied players", () => {
    render(<DirectorTableControls tables={tables()} onOpenTable={vi.fn()} />);

    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
  });

  it("opens the management dialog for the tapped table", () => {
    const onOpenTable = vi.fn();
    const data = tables();
    render(<DirectorTableControls tables={data} onOpenTable={onOpenTable} />);

    fireEvent.click(screen.getByRole("button", { name: "Manage table 1" }));
    expect(onOpenTable).toHaveBeenCalledWith(data[0]);
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
      <DirectorTableControls tables={withStationary} onOpenTable={vi.fn()} />,
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
      <DirectorTableControls tables={withStationary} onOpenTable={vi.fn()} />,
    );

    // Both NS compass positions show the badge despite being unoccupied.
    expect(screen.getAllByText("Stationary")).toHaveLength(2);
  });

  it("renders no Stationary badge when no stationary info is provided", () => {
    render(<DirectorTableControls tables={tables()} onOpenTable={vi.fn()} />);

    expect(screen.queryByText("Stationary")).not.toBeInTheDocument();
  });

  it("shows a board range for a table's placement", () => {
    const withPlacement: DirectorTable[] = [
      { ...tables()[0], placement: { boardStart: 1, boardEnd: 3 } },
    ];

    render(
      <DirectorTableControls tables={withPlacement} onOpenTable={vi.fn()} />,
    );

    expect(screen.getByText("Boards 1\u20133")).toBeInTheDocument();
  });

  it("shows a single board (not a range) when start equals end", () => {
    const withPlacement: DirectorTable[] = [
      { ...tables()[0], placement: { boardStart: 5, boardEnd: 5 } },
    ];

    render(
      <DirectorTableControls tables={withPlacement} onOpenTable={vi.fn()} />,
    );

    expect(screen.getByText("Board 5")).toBeInTheDocument();
  });

  it("appends the physical copy when the movement uses copies", () => {
    const withPlacement: DirectorTable[] = [
      {
        ...tables()[0],
        placement: { boardStart: 1, boardEnd: 3, boardCopy: "B" },
      },
    ];

    render(
      <DirectorTableControls tables={withPlacement} onOpenTable={vi.fn()} />,
    );

    expect(screen.getByText("Boards 1\u20133 (Copy B)")).toBeInTheDocument();
  });

  it("shows a share note (singular and plural)", () => {
    const single: DirectorTable[] = [
      {
        ...tables()[0],
        placement: { boardStart: 1, boardEnd: 2, sharesWith: [2] },
      },
    ];

    const { rerender } = render(
      <DirectorTableControls tables={single} onOpenTable={vi.fn()} />,
    );
    expect(screen.getByText("Shares with table 2")).toBeInTheDocument();

    const multi: DirectorTable[] = [
      {
        ...tables()[0],
        placement: { boardStart: 1, boardEnd: 2, sharesWith: [2, 3] },
      },
    ];
    rerender(<DirectorTableControls tables={multi} onOpenTable={vi.fn()} />);
    expect(screen.getByText("Shares with tables 2, 3")).toBeInTheDocument();
  });

  it("shows a relay note", () => {
    const withRelay: DirectorTable[] = [
      {
        ...tables()[0],
        placement: { boardStart: 1, boardEnd: 2, relayWith: 4 },
      },
    ];

    render(<DirectorTableControls tables={withRelay} onOpenTable={vi.fn()} />);

    expect(screen.getByText("Relay \u2192 table 4")).toBeInTheDocument();
  });

  it("renders no board placement when the table has none", () => {
    render(<DirectorTableControls tables={tables()} onOpenTable={vi.fn()} />);

    expect(screen.queryByText(/^Boards? /)).not.toBeInTheDocument();
    expect(screen.queryByText(/Shares with/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Relay/)).not.toBeInTheDocument();
  });
});
