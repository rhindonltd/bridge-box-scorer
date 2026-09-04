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

  it("renders the Not Played special outcome", () => {
    render(<StepConfirm {...baseProps} specialOutcome="NP" onSubmit={vi.fn()} />);
    expect(screen.getByText("Not Played")).toBeInTheDocument();
  });

  it("renders a doubled red-suit contract with a lead", () => {
    render(
      <StepConfirm
        {...baseProps}
        level={4}
        suit="H"
        declarer="S"
        dbl="X"
        leadSuit="D"
        leadRank="K"
        resultMode="made"
        resultValue={1}
        onSubmit={vi.fn()}
      />,
    );

    // Doubled contract by South (X doubling appears in the summary line).
    const summary = screen.getByText(/by South/);
    expect(summary).toBeInTheDocument();
    expect(summary.textContent).toMatch(/ X by South/);
    // Lead present.
    expect(screen.getByText(/Lead:/)).toBeInTheDocument();
    // Made with overtricks.
    expect(screen.getByText("Made +1")).toBeInTheDocument();
  });

  it("renders a black-suit opening lead", () => {
    render(
      <StepConfirm
        {...baseProps}
        level={3}
        suit="NT"
        declarer="N"
        leadSuit="S"
        leadRank="7"
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Lead:/)).toBeInTheDocument();
  });

  it("renders a redoubled black-suit contract without a lead", () => {
    render(
      <StepConfirm
        {...baseProps}
        level={2}
        suit="C"
        declarer="W"
        dbl="XX"
        resultMode="made"
        resultValue={0}
        onSubmit={vi.fn()}
      />,
    );

    const summary = screen.getByText(/by West/);
    expect(summary.textContent).toMatch(/ XX by West/);
    // No lead line.
    expect(screen.queryByText(/Lead:/)).not.toBeInTheDocument();
  });

  it("renders no contract summary when the contract is incomplete", () => {
    render(<StepConfirm {...baseProps} level={3} onSubmit={vi.fn()} />);
    // Declarer/suit missing -> contract summary is null.
    expect(screen.queryByText(/ by /)).not.toBeInTheDocument();
  });
});
