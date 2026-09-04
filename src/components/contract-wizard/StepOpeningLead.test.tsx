import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepOpeningLead } from "./StepOpeningLead";
import { SuitMap } from "@/model/common";

describe("StepOpeningLead", () => {
  it("defaults to the spade ace and completes the lead", () => {
    const onLeadComplete = vi.fn();
    render(<StepOpeningLead onLeadComplete={onLeadComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onLeadComplete).toHaveBeenCalledWith("S", "A");
  });

  it("honours initial suit and rank", () => {
    const onLeadComplete = vi.fn();
    render(
      <StepOpeningLead
        onLeadComplete={onLeadComplete}
        initialSuit="C"
        initialRank="K"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onLeadComplete).toHaveBeenCalledWith("C", "K");
  });

  it("notifies suit and rank changes when callbacks are provided", () => {
    const onLeadComplete = vi.fn();
    const onSuitChange = vi.fn();
    const onRankChange = vi.fn();
    render(
      <StepOpeningLead
        onLeadComplete={onLeadComplete}
        onSuitChange={onSuitChange}
        onRankChange={onRankChange}
      />,
    );

    // Click each of the four suit buttons to exercise every suitStyle branch.
    fireEvent.click(screen.getAllByRole("button", { name: SuitMap.H })[0]);
    expect(onSuitChange).toHaveBeenCalledWith("H");
    fireEvent.click(screen.getAllByRole("button", { name: SuitMap.D })[0]);
    expect(onSuitChange).toHaveBeenCalledWith("D");
    fireEvent.click(screen.getAllByRole("button", { name: SuitMap.C })[0]);
    expect(onSuitChange).toHaveBeenCalledWith("C");
    fireEvent.click(screen.getAllByRole("button", { name: SuitMap.S })[0]);
    expect(onSuitChange).toHaveBeenCalledWith("S");

    fireEvent.click(screen.getByRole("button", { name: "K" }));
    expect(onRankChange).toHaveBeenCalledWith("K");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onLeadComplete).toHaveBeenCalledWith("S", "K");
  });

  it("works without optional change callbacks", () => {
    const onLeadComplete = vi.fn();
    render(<StepOpeningLead onLeadComplete={onLeadComplete} />);

    // No onSuitChange/onRankChange -> exercises the optional-call fallback.
    fireEvent.click(screen.getAllByRole("button", { name: SuitMap.H })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Q" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onLeadComplete).toHaveBeenCalledWith("H", "Q");
  });
});
