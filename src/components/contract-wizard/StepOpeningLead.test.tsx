import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepOpeningLead } from "./StepOpeningLead";

describe("StepOpeningLead", () => {
  it("defaults to SA and completes with the selected suit + rank", () => {
    const onLeadComplete = vi.fn();
    render(<StepOpeningLead onLeadComplete={onLeadComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    // Defaults: suit S, rank A.
    expect(onLeadComplete).toHaveBeenCalledWith("S", "A");
  });

  it("reports suit and rank changes via optional callbacks and completes the chosen card", () => {
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

    fireEvent.click(screen.getByRole("button", { name: "K" }));
    expect(onRankChange).toHaveBeenCalledWith("K");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onLeadComplete).toHaveBeenCalledWith("S", "K");
  });

  it("honours initial suit/rank props", () => {
    const onLeadComplete = vi.fn();
    render(
      <StepOpeningLead
        onLeadComplete={onLeadComplete}
        initialSuit="H"
        initialRank="Q"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onLeadComplete).toHaveBeenCalledWith("H", "Q");
  });
});
