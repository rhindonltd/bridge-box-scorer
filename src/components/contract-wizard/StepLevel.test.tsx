import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepLevel } from "./StepLevel";

describe("StepLevel", () => {
  it("renders all seven level buttons and calls onLevelSelected", () => {
    const onLevelSelected = vi.fn();
    render(
      <StepLevel
        onLevelSelected={onLevelSelected}
        onSpecialOutcome={vi.fn()}
      />,
    );

    for (let level = 1; level <= 7; level++) {
      expect(
        screen.getByRole("button", { name: String(level) }),
      ).toBeInTheDocument();
    }

    fireEvent.click(screen.getByRole("button", { name: "3" }));
    expect(onLevelSelected).toHaveBeenCalledWith(3);
  });

  it("fires special outcomes for Not Played and Pass Out", () => {
    const onSpecialOutcome = vi.fn();
    render(
      <StepLevel
        onLevelSelected={vi.fn()}
        onSpecialOutcome={onSpecialOutcome}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Not Played" }));
    expect(onSpecialOutcome).toHaveBeenCalledWith("NP");

    fireEvent.click(screen.getByRole("button", { name: "Pass Out" }));
    expect(onSpecialOutcome).toHaveBeenCalledWith("PO");
  });

  it("shows the Adjusted Score button only when the handler is provided", () => {
    const onAdjustedScore = vi.fn();
    const { rerender } = render(
      <StepLevel onLevelSelected={vi.fn()} onSpecialOutcome={vi.fn()} />,
    );
    expect(
      screen.queryByRole("button", { name: "Adjusted Score" }),
    ).not.toBeInTheDocument();

    rerender(
      <StepLevel
        onLevelSelected={vi.fn()}
        onSpecialOutcome={vi.fn()}
        onAdjustedScore={onAdjustedScore}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Adjusted Score" }));
    expect(onAdjustedScore).toHaveBeenCalled();
  });
});
