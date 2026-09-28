import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DealEntry } from "./DealEntry";
import type { Card, Deal, Rank } from "@/model/common";
import { Ranks, Suits } from "@/model/common";

/**
 * Enter a full, legal deal by assigning one whole suit to three directions:
 * N=spades, E=hearts, S=diamonds. The fourth hand (W=clubs) is filled
 * automatically once the other three are complete, so it is not entered here.
 */
function enterFullDeal() {
  const suitFor = { N: "S", E: "H", S: "D" } as const;
  for (const dir of ["N", "E", "S"] as const) {
    fireEvent.click(screen.getByTestId(`entry-dir-${dir}`));
    // Suit is a toggle: reveal that suit's rank buttons before tapping them.
    fireEvent.click(screen.getByTestId(`entry-suit-${suitFor[dir]}`));
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

  it("auto-fills the fourth hand once three hands are complete", () => {
    const onSubmit = vi.fn();
    render(<DealEntry boardNumber={1} onSubmit={onSubmit} />);

    // Fill three hands: N=spades, E=hearts, S=diamonds. The fourth (W) should
    // then be filled automatically with the remaining clubs.
    const suitFor = { N: "S", E: "H", S: "D" } as const;
    for (const dir of ["N", "E", "S"] as const) {
      fireEvent.click(screen.getByTestId(`entry-dir-${dir}`));
      fireEvent.click(screen.getByTestId(`entry-suit-${suitFor[dir]}`));
      for (const rank of Ranks) {
        fireEvent.click(screen.getByTestId(`card-${suitFor[dir]}${rank}`));
      }
    }

    // West's tab now reads 13/13 without any manual entry.
    expect(screen.getByTestId("entry-dir-W")).toHaveTextContent("13/13");

    // The deal is complete, so Save is enabled and submits all four hands.
    const save = screen.getByTestId("deal-entry-save") as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    const deal = onSubmit.mock.calls[0][0] as Deal;
    expect(deal.W).toHaveLength(13);
    expect(deal.W.every((c) => c.startsWith("C"))).toBe(true);
  });

  it("lets the player make corrections after the fourth hand is auto-filled", () => {
    render(<DealEntry boardNumber={1} onSubmit={vi.fn()} />);

    const suitFor = { N: "S", E: "H", S: "D" } as const;
    for (const dir of ["N", "E", "S"] as const) {
      fireEvent.click(screen.getByTestId(`entry-dir-${dir}`));
      fireEvent.click(screen.getByTestId(`entry-suit-${suitFor[dir]}`));
      for (const rank of Ranks) {
        fireEvent.click(screen.getByTestId(`card-${suitFor[dir]}${rank}`));
      }
    }
    // Fourth hand auto-filled, deal complete.
    expect(screen.getByTestId("entry-dir-W")).toHaveTextContent("13/13");
    expect(
      (screen.getByTestId("deal-entry-save") as HTMLButtonElement).disabled,
    ).toBe(false);

    // Deselect the ace of spades from North: the deal becomes incomplete again
    // (auto-fill does not snap North back), so Save is disabled until the card
    // is placed again.
    fireEvent.click(screen.getByTestId("entry-dir-N"));
    fireEvent.click(screen.getByTestId("entry-suit-S"));
    fireEvent.click(screen.getByTestId("card-SA"));

    expect(screen.getByTestId("entry-dir-N")).toHaveTextContent("12/13");
    expect(
      (screen.getByTestId("deal-entry-save") as HTMLButtonElement).disabled,
    ).toBe(true);
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

    // Switch the suit toggle to hearts to reveal its rank buttons.
    fireEvent.click(screen.getByTestId("entry-suit-H"));
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

  it("hides its built-in submit button when the parent owns submit", () => {
    render(<DealEntry boardNumber={1} onSubmit={vi.fn()} hideSubmit />);
    expect(screen.queryByTestId("deal-entry-save")).not.toBeInTheDocument();

    // Even once the deal is complete, no built-in button appears.
    enterFullDeal();
    expect(screen.queryByTestId("deal-entry-save")).not.toBeInTheDocument();
  });

  it("reports the deal up via onDealChange (null until complete)", () => {
    const onDealChange = vi.fn();
    render(
      <DealEntry
        boardNumber={1}
        onSubmit={vi.fn()}
        hideSubmit
        onDealChange={onDealChange}
      />,
    );

    // Initial (empty) render reports null.
    expect(onDealChange).toHaveBeenLastCalledWith(null);

    enterFullDeal();

    // Once complete, the full deal is handed up.
    const lastArg = onDealChange.mock.calls.at(-1)?.[0] as Deal;
    expect(lastArg).not.toBeNull();
    expect(lastArg.N).toHaveLength(13);
    expect(lastArg.W).toHaveLength(13);
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
