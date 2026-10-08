import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepTeamsRemoval } from "./StepTeamsRemoval";

describe("StepTeamsRemoval", () => {
  it("submits opponents (EW) at fault", () => {
    const onSubmit = vi.fn();
    render(<StepTeamsRemoval onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Opponents \(EW\) at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("EW_FAULT");
  });

  it("submits this table (NS) at fault", () => {
    const onSubmit = vi.fn();
    render(<StepTeamsRemoval onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /This table \(NS\) at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("NS_FAULT");
  });

  it("submits neither at fault", () => {
    const onSubmit = vi.fn();
    render(<StepTeamsRemoval onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Neither side at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("NEITHER_FAULT");
  });

  it("submits both at fault", () => {
    const onSubmit = vi.fn();
    render(<StepTeamsRemoval onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /Both sides at fault/ }));
    expect(onSubmit).toHaveBeenCalledWith("BOTH_FAULT");
  });

  it("shows IMP wording by default and board-win wording for board-comparison", () => {
    const { rerender } = render(<StepTeamsRemoval onSubmit={vi.fn()} />);
    expect(screen.getByText(/NS \+3 IMPs, EW −3/)).toBeInTheDocument();

    rerender(<StepTeamsRemoval onSubmit={vi.fn()} boardComparison />);
    expect(
      screen.getByText(/This table wins the board, opponents lose/),
    ).toBeInTheDocument();
  });
});
