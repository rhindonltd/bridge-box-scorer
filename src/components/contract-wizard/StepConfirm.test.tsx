import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepConfirm } from "./StepConfirm";

const baseProps = {
  level: null,
  suit: null,
  declarer: null,
  dbl: "" as const,
  specialOutcome: null,
  leadSuit: null,
  leadRank: null,
  resultMode: "made" as const,
  resultValue: 0,
};

describe("StepConfirm", () => {
  it("summarises a played contract and submits", () => {
    const onSubmit = vi.fn();
    render(
      <StepConfirm
        {...baseProps}
        level={3}
        suit="NT"
        declarer="N"
        onSubmit={onSubmit}
      />,
    );

    // "3NT by North" contract summary.
    expect(screen.getByText(/by North/)).toBeInTheDocument();
    // Exact make shows a tick.
    expect(screen.getByText(/Made/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("renders a special outcome label instead of a contract", () => {
    const onSubmit = vi.fn();
    render(
      <StepConfirm {...baseProps} specialOutcome="PO" onSubmit={onSubmit} />,
    );

    expect(screen.getByText("Pass Out")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("shows a down result", () => {
    render(
      <StepConfirm
        {...baseProps}
        level={4}
        suit="S"
        declarer="E"
        resultMode="down"
        resultValue={2}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText("Down 2")).toBeInTheDocument();
  });
});
