import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepVoidMatch } from "./StepVoidMatch";

describe("StepVoidMatch", () => {
  it("submits an incorrect-seating (flat 40%) void", () => {
    const onSubmit = vi.fn();
    render(<StepVoidMatch onSubmit={onSubmit} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Incorrect seating \/ cannot replay/ }),
    );
    expect(onSubmit).toHaveBeenCalledWith("SEATING_STANDARD");
  });

  it("submits the TD-at-fault converse", () => {
    const onSubmit = vi.fn();
    render(<StepVoidMatch onSubmit={onSubmit} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Incorrect seating — TD at fault/ }),
    );
    expect(onSubmit).toHaveBeenCalledWith("SEATING_TD");
  });

  it("submits a §3.3.9 one-side-offended split", () => {
    const onSubmit = vi.fn();
    render(<StepVoidMatch onSubmit={onSubmit} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Opponents \(EW\) at fault/ }),
    );
    expect(onSubmit).toHaveBeenCalledWith("SHORT_OFFENDER_EW");
  });

  it("submits the both- and neither-at-fault §3.3.9 variants", () => {
    const onSubmit = vi.fn();
    render(<StepVoidMatch onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Both sides at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("SHORT_BOTH");
    fireEvent.click(screen.getByRole("button", { name: /Neither side at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("SHORT_NEITHER");
  });
});
