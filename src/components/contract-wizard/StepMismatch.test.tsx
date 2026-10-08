import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepMismatch } from "./StepMismatch";

describe("StepMismatch", () => {
  it("picks a side then a treatment and submits the full ruling", () => {
    const onSubmit = vi.fn();
    render(<StepMismatch onSubmit={onSubmit} />);

    // Stage 1: choose the mismatched side.
    fireEvent.click(screen.getByRole("button", { name: /This table \(NS\)/ }));

    // Stage 2: choose the §3.5.2 treatment.
    fireEvent.click(
      screen.getByRole("button", { name: /Stronger opponent — not their fault/ }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      side: "NS",
      direction: "HIGHER",
      fault: "NOT",
    });
  });

  it("submits the opponent + weaker/own-fault treatment", () => {
    const onSubmit = vi.fn();
    render(<StepMismatch onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /Opponents \(EW\)/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /Weaker opponent — their own fault/ }),
    );

    expect(onSubmit).toHaveBeenCalledWith({
      side: "EW",
      direction: "LOWER",
      fault: "OWN",
    });
  });

  it("labels the side as a team when teams is set", () => {
    render(<StepMismatch teams onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: /This team \(NS\)/ }),
    ).toBeInTheDocument();
  });
});
