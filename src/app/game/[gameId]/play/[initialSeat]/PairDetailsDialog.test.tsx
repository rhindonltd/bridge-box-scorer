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
  it("separates the section and pair, and shows the side and both players", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={nsPair}
        section="A"
        pairLabel="1NS"
      />,
    );

    // Section and pair are shown as separate labelled rows (not "A1NS").
    expect(screen.getByText("Section:")).toBeInTheDocument();
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Pair:")).toBeInTheDocument();
    expect(screen.getByText("1NS")).toBeInTheDocument();
    expect(screen.queryByText("A1NS")).toBeNull();

    expect(screen.getByText("North–South")).toBeInTheDocument();
    expect(screen.getByText("Ann Smith")).toBeInTheDocument();
    expect(screen.getByText("Ben Jones")).toBeInTheDocument();
  });

  it("omits the section row when no section is given (single-section game)", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={nsPair}
        section={null}
        pairLabel="1NS"
      />,
    );

    expect(screen.queryByText("Section:")).toBeNull();
    expect(screen.getByText("Pair:")).toBeInTheDocument();
    expect(screen.getByText("1NS")).toBeInTheDocument();
  });

  it("shows a one-winner pair number without a direction", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={nsPair}
        section={null}
        pairLabel="1"
      />,
    );

    expect(screen.getByText("Pair:")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("shows a player's national number when present and hides it when absent", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={nsPair}
        section="A"
        pairLabel="1NS"
      />,
    );

    // Ann has a national id; Ben does not.
    expect(screen.getByText("No. 1001")).toBeInTheDocument();
    expect(screen.queryByText(/No\. /)).toHaveTextContent("No. 1001");
    expect(screen.queryAllByText(/^No\. /)).toHaveLength(1);
  });

  it("uses the East–West label for an EW pair", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={{ side: "EW", players: nsPair.players }}
        section="A"
        pairLabel="1EW"
      />,
    );

    expect(screen.getByText("East–West")).toBeInTheDocument();
  });

  it("shows the loading text while the pair is null", () => {
    render(
      <PairDetailsDialog
        open
        onOpenChange={vi.fn()}
        pair={null}
        section={null}
        pairLabel={null}
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
        section="A"
        pairLabel="1NS"
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
        section="A"
        pairLabel="1NS"
      />,
    );

    // Headless UI's Dialog fires onClose on Escape, exercising the dialog's own
    // dismiss path (distinct from the Done button).
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
