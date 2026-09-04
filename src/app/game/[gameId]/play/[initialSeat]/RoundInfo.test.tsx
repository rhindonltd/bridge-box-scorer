import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RoundInfo from "@/app/game/[gameId]/play/[initialSeat]/RoundInfo";

vi.mock("@/components/common/CardTable", () => ({
  default: ({ tableNumber }: { tableNumber: number }) => (
    <div data-testid="card-table">Table {tableNumber}</div>
  ),
}));

const players = {
  N: { id: "n" },
  S: { id: "s" },
  E: { id: "e" },
  W: { id: "w" },
} as any;

describe("RoundInfo", () => {
  it("renders a single board with the singular 'Board' label", () => {
    render(<RoundInfo table={3} boards={[5]} players={players} />);
    expect(screen.getByText(/Board\s*5/)).toBeInTheDocument();
    expect(screen.getByTestId("card-table")).toHaveTextContent("Table 3");
  });

  it("renders multiple boards with the plural 'Boards' label", () => {
    render(<RoundInfo table={1} boards={[1, 2]} players={players} />);
    expect(screen.getByText(/Boards\s*1 to 2/)).toBeInTheDocument();
  });
});
