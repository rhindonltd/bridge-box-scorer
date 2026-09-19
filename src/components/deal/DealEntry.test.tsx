import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DealEntry } from "./DealEntry";
import type { Card, Deal, Rank } from "@/model/common";
import { Directions, Ranks, Suits } from "@/model/common";

/**
 * Enter a full, legal deal by assigning one whole suit to each direction:
 * N=spades, E=hearts, S=diamonds, W=clubs. Selecting the direction then tapping
 * that suit's 13 ranks builds a complete deal.
 */
function enterFullDeal() {
  const suitFor = { N: "S", E: "H", S: "D", W: "C" } as const;
  for (const dir of Directions) {
    fireEvent.click(screen.getByTestId(`entry-dir-${dir}`));
    for (const rank of Ranks) {
      fireEvent.click(screen.getByTestId(`card-${suitFor[dir]}${rank}`));
    }
  }
}

describe("DealEntry", () => {
  it("keeps Save disabled until a complete 52-card deal is entered", () => {
    render(<DealEntry boardNumber={1} onSubmit={vi.fn()} />);

    const save = screen.getByTestId("deal-entry-save") as HTMLButtonElement;
    expect(save.disabled).toBe(true);

    // Assign only North's spades — still incomplete.
    fireEvent.click(screen.getByTestId("entry-dir-N"));
    for (const rank of Ranks) {
      fireEvent.click(screen.getByTestId(`card-S${rank}`));
    }
    expect(save.disabled).toBe(true);
  });

  it("enables Save and submits the full deal once complete", () => {
    const onSubmit = vi.fn();
    render(<DealEntry boardNumber={1} onSubmit={onSubmit} />);

    enterFullDeal();

    const save = screen.getByTestId("deal-entry-save") as HTMLButtonElement;
    expect(save.disabled).toBe(false);

    fireEvent.click(save);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const deal = onSubmit.mock.calls[0][0] as Deal;
    expect(deal.N).toHaveLength(13);
    expect(deal.E).toHaveLength(13);
    expect(deal.S).toHaveLength(13);
    expect(deal.W).toHaveLength(13);
  });

  it("prevents assigning a card already used in another hand", () => {
    render(<DealEntry boardNumber={1} onSubmit={vi.fn()} />);

    // Put the ace of spades in North.
    fireEvent.click(screen.getByTestId("entry-dir-N"));
    fireEvent.click(screen.getByTestId("card-SA"));

    // Switch to East: the ace of spades is now disabled.
    fireEvent.click(screen.getByTestId("entry-dir-E"));
    const asButton = screen.getByTestId("card-SA") as HTMLButtonElement;
    expect(asButton.disabled).toBe(true);
  });

  it("rejects a 14th card once the active hand already holds 13", () => {
    render(<DealEntry boardNumber={1} onSubmit={vi.fn()} />);

    // Fill North with all 13 spades.
    fireEvent.click(screen.getByTestId("entry-dir-N"));
    for (const rank of Ranks) {
      fireEvent.click(screen.getByTestId(`card-S${rank}`));
    }
    // The North tab shows the full-hand ring at 13/13.
    expect(screen.getByTestId("entry-dir-N")).toHaveTextContent("13/13");

    // A heart is not used anywhere, so its button stays enabled; tapping it
    // hits the `hand.length >= 13` guard and is ignored (still 13 in North).
    const heartAce = screen.getByTestId("card-HA") as HTMLButtonElement;
    expect(heartAce.disabled).toBe(false);
    fireEvent.click(heartAce);
    expect(screen.getByTestId("entry-dir-N")).toHaveTextContent("13/13");
    // The heart was not added (it would render as selected/blue otherwise).
    expect(heartAce.className).not.toContain("bg-blue-600");
  });

  it("deselects a card from the active hand when tapped again", () => {
    render(<DealEntry boardNumber={1} onSubmit={vi.fn()} />);

    fireEvent.click(screen.getByTestId("entry-dir-N"));
    const spadeAce = screen.getByTestId("card-SA") as HTMLButtonElement;
    fireEvent.click(spadeAce); // select
    expect(spadeAce.className).toContain("bg-blue-600");
    fireEvent.click(spadeAce); // deselect
    expect(spadeAce.className).not.toContain("bg-blue-600");
  });

  it("shows the deal read-only when someone else entered it first", () => {
    const ranks: Rank[] = [
      "A",
      "K",
      "Q",
      "J",
      "T",
      "9",
      "8",
      "7",
      "6",
      "5",
      "4",
      "3",
      "2",
    ];
    const deal: Deal = {
      N: ranks.map((r): Card => `S${r}`),
      E: ranks.map((r): Card => `H${r}`),
      S: ranks.map((r): Card => `D${r}`),
      W: ranks.map((r): Card => `C${r}`),
    };
    render(
      <DealEntry boardNumber={1} onSubmit={vi.fn()} readOnlyDeal={deal} />,
    );

    expect(screen.getByTestId("deal-entry-readonly")).toBeInTheDocument();
    expect(screen.queryByTestId("deal-entry-save")).not.toBeInTheDocument();
  });

  // Reference Suits import so lint keeps it and the suit set stays in sync.
  it("has four suits", () => {
    expect(Suits).toHaveLength(4);
  });
});
