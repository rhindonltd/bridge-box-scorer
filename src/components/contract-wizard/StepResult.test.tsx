import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepResult } from "./StepResult";

describe("StepResult", () => {
  it("defaults to 'made' and reports made results including exact make", () => {
    const onResultComplete = vi.fn();
    // level 3 -> requiredTricks 9, maxOver 4 -> made buttons =, +1..+4
    render(<StepResult level={3} onResultComplete={onResultComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "=" }));
    expect(onResultComplete).toHaveBeenCalledWith("made", 0);

    fireEvent.click(screen.getByRole("button", { name: "+2" }));
    expect(onResultComplete).toHaveBeenCalledWith("made", 2);
  });

  it("switches to 'down' mode and reports down results", () => {
    const onResultComplete = vi.fn();
    render(<StepResult level={3} onResultComplete={onResultComplete} />);

    fireEvent.click(screen.getByRole("button", { name: "Down" }));
    fireEvent.click(screen.getByRole("button", { name: "-1" }));
    expect(onResultComplete).toHaveBeenCalledWith("down", 1);
  });
});
