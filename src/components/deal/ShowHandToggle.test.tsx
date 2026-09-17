import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShowHandToggle } from "./ShowHandToggle";
import { DealDisplay } from "./DealDisplay";
import type { Deal } from "@/model/common";

function validDeal(): Deal {
  const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  return {
    N: ranks.map((r) => `${r}S`),
    E: ranks.map((r) => `${r}H`),
    S: ranks.map((r) => `${r}D`),
    W: ranks.map((r) => `${r}C`),
  };
}

/** A deal with a void suit in North (no diamonds; extra spade instead). */
function dealWithVoid(): Deal {
  return {
    // North: 6 spades + 4 hearts + 0 diamonds + 3 clubs = 13, diamonds void.
    N: ["AS", "KS", "QS", "JS", "TS", "9S", "AH", "KH", "QH", "JH", "AC", "KC", "QC"],
    E: ["8S", "7S", "6S", "TH", "9H", "8H", "7H", "6H", "5H", "JC", "TC", "9C", "8C"],
    S: ["5S", "4S", "3S", "2S", "4H", "3H", "2H", "AD", "KD", "QD", "JD", "TD", "9D"],
    W: ["8D", "7D", "6D", "5D", "4D", "3D", "2D", "7C", "6C", "5C", "4C", "3C", "2C"],
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
