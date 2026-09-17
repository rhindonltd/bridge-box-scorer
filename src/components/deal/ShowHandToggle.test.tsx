import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShowHandToggle } from "./ShowHandToggle";
import { DealDisplay } from "./DealDisplay";
import type { Card, Deal, Rank } from "@/model/common";

function validDeal(): Deal {
  const ranks: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  return {
    N: ranks.map((r): Card => `S${r}`),
    E: ranks.map((r): Card => `H${r}`),
    S: ranks.map((r): Card => `D${r}`),
    W: ranks.map((r): Card => `C${r}`),
  };
}

/** A deal with a void suit in North (no diamonds; extra spade instead). */
function dealWithVoid(): Deal {
  return {
    // North: 6 spades + 4 hearts + 0 diamonds + 3 clubs = 13, diamonds void.
    N: ["SA", "SK", "SQ", "SJ", "ST", "S9", "HA", "HK", "HQ", "HJ", "CA", "CK", "CQ"],
    E: ["S8", "S7", "S6", "HT", "H9", "H8", "H7", "H6", "H5", "CJ", "CT", "C9", "C8"],
    S: ["S5", "S4", "S3", "S2", "H4", "H3", "H2", "DA", "DK", "DQ", "DJ", "DT", "D9"],
    W: ["D8", "D7", "D6", "D5", "D4", "D3", "D2", "C7", "C6", "C5", "C4", "C3", "C2"],
  };
}

describe("DealDisplay", () => {
  it("renders nothing when there is no deal", () => {
    const { container } = render(
      <DealDisplay boardNumber={1} deal={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders all four hands when a deal is present", () => {
    render(<DealDisplay boardNumber={1} deal={validDeal()} />);
    // Compass + stacked layouts both render, so each direction appears twice.
    expect(screen.getAllByTestId("hand-N").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("hand-E").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("hand-S").length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("hand-W").length).toBeGreaterThan(0);
  });

  it("marks the dealer derived from the board number (board 1 => North)", () => {
    render(<DealDisplay boardNumber={1} deal={validDeal()} />);
    expect(screen.getAllByTestId("dealer-N").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("dealer-E")).toBeNull();
  });

  it("marks East as dealer for board 2", () => {
    render(<DealDisplay boardNumber={2} deal={validDeal()} />);
    expect(screen.getAllByTestId("dealer-E").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("dealer-N")).toBeNull();
  });

  it("shows a dash for a void suit", () => {
    render(<DealDisplay boardNumber={1} deal={dealWithVoid()} />);
    // North has no diamonds -> at least one dash rendered.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});

describe("ShowHandToggle", () => {
  it("renders nothing when there is no deal", () => {
    const { container } = render(
      <ShowHandToggle boardNumber={1} deal={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("is off by default and reveals the hand when clicked", () => {
    render(<ShowHandToggle boardNumber={1} deal={validDeal()} />);

    // Hidden by default.
    expect(screen.queryByTestId("deal-display")).toBeNull();
    const toggle = screen.getByTestId("show-hand-toggle");
    expect(toggle).toHaveTextContent("Show hand");

    // Reveal.
    fireEvent.click(toggle);
    expect(screen.getByTestId("deal-display")).toBeInTheDocument();
    expect(toggle).toHaveTextContent("Hide hand");

    // Hide again.
    fireEvent.click(toggle);
    expect(screen.queryByTestId("deal-display")).toBeNull();
  });
});
