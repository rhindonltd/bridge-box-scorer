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

  it("renders the anchor's two half-match segments with a midpoint-switch instruction", () => {
    render(
      <RoundInfo
        table={1}
        boards={[1, 2, 3, 4]}
        players={players}
        halfMatch={{
          role: "anchor",
          segments: [
            { half: "first", boards: [1, 2], players },
            { half: "second", boards: [3, 4], players },
          ],
        }}
      />,
    );

    expect(screen.getByTestId("round-info-half-match")).toBeInTheDocument();
    expect(screen.getByText(/two half matches/i)).toBeInTheDocument();
    expect(screen.getByTestId("half-first")).toHaveTextContent(/First half/);
    expect(screen.getByTestId("half-second")).toHaveTextContent(/Second half/);
  });

  it("tells a first-half non-anchor it is done after its half", () => {
    render(
      <RoundInfo
        table={1}
        boards={[1, 2]}
        players={players}
        halfMatch={{
          role: "firstHalf",
          segments: [{ half: "first", boards: [1, 2], players }],
        }}
      />,
    );

    expect(screen.getByText(/first half.*then you're done/i)).toBeInTheDocument();
    expect(screen.getByTestId("half-first")).toBeInTheDocument();
    expect(screen.queryByTestId("half-second")).not.toBeInTheDocument();
  });

  it("tells a second-half non-anchor it comes in for the second half", () => {
    render(
      <RoundInfo
        table={1}
        boards={[3, 4]}
        players={players}
        halfMatch={{
          role: "secondHalf",
          segments: [{ half: "second", boards: [3, 4], players }],
        }}
      />,
    );

    expect(screen.getByText(/come in for the second half/i)).toBeInTheDocument();
    expect(screen.getByTestId("half-second")).toBeInTheDocument();
  });
});
