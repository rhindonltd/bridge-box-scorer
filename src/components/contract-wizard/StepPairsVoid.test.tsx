import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepPairsVoid } from "./StepPairsVoid";

describe("StepPairsVoid", () => {
  it("submits opponents (EW) at fault", () => {
    const onSubmit = vi.fn();
    render(<StepPairsVoid onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Opponents \(EW\) at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("OFFENDER_EW");
  });

  it("submits this table (NS) at fault", () => {
    const onSubmit = vi.fn();
    render(<StepPairsVoid onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /This table \(NS\) at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("OFFENDER_NS");
  });

  it("submits neither and both at fault", () => {
    const onSubmit = vi.fn();
    render(<StepPairsVoid onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Neither side at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("NEITHER");
    fireEvent.click(screen.getByRole("button", { name: /Both sides at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("BOTH");
  });
});
