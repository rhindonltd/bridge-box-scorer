import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { PairDetailsDialog } from "./PairDetailsDialog";
import type { SeatedPair } from "@/context/AssignmentContext";

function makePlayer(
  id: number,
  firstName: string,
  lastName: string,
  nationalId: string | null = null,
) {
  return { id, firstName, lastName, nationalId };
}

const nsPair: SeatedPair = {
  side: "NS",
  players: [
    makePlayer(1, "Ann", "Smith", "1001"),
    makePlayer(2, "Ben", "Jones", null),
  ],
};

describe("PairDetailsDialog", () => {
  it("shows the pair number and both players' names", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={nsPair}
        pairId="3"
      />,
    );

    expect(screen.getByText("Pair: 3")).toBeInTheDocument();
    expect(screen.getByText("Ann Smith")).toBeInTheDocument();
    expect(screen.getByText("Ben Jones")).toBeInTheDocument();
  });

  it("does not repeat the side once the pair has a number", () => {
    // "1NS" already says North–South; and for a plain number (a Howell) the
    // starting side would be misleading, since pairs change direction.
    for (const pairId of ["A1NS", "3"]) {
      const { unmount } = render(
        <PairDetailsDialog
          open
          onOpenChange={vi.fn()}
          pair={nsPair}
          pairId={pairId}
        />,
      );
      expect(screen.queryByText("North–South")).not.toBeInTheDocument();
      unmount();
    }
  });

  it("shows a player's national number when present and hides it when absent", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={nsPair}
        pairId="3"
      />,
    );

    // Ann has a national id; Ben does not.
    expect(screen.getByText("No. 1001")).toBeInTheDocument();
    expect(screen.queryByText(/No\. /)).toHaveTextContent("No. 1001");
    expect(screen.queryAllByText(/^No\. /)).toHaveLength(1);
  });

  it("shows the side the pair sat at before a movement gives it a number", () => {
    const { unmount } = render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={nsPair}
        pairId={null}
      />,
    );
    expect(screen.getByText("Pair details")).toBeInTheDocument();
    expect(screen.getByText("North–South")).toBeInTheDocument();
    unmount();

    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={{ side: "EW", players: nsPair.players }}
        pairId={null}
      />,
    );
    expect(screen.getByText("East–West")).toBeInTheDocument();
  });

  it("falls back to a generic title and loading text while the pair is null", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={null}
        pairId={null}
      />,
    );

    expect(screen.getByText("Pair details")).toBeInTheDocument();
    expect(screen.getByText(/Loading pair details/)).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when Done is clicked", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <PairDetailsDialog
        open
        onOpenChange={onOpenChange}
        pair={nsPair}
        pairId="3"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("calls onOpenChange(false) when the dialog is dismissed with Escape", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <PairDetailsDialog
        open
        onOpenChange={onOpenChange}
        pair={nsPair}
        pairId="3"
      />,
    );

    // Headless UI's Dialog fires onClose on Escape, exercising the dialog's own
    // dismiss path (distinct from the Done button).
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
