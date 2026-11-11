import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepWeightedScore } from "./StepWeightedScore";

function click(name: string | RegExp) {
  fireEvent.click(screen.getByRole("button", { name }));
}

/** Drive the add-component flow: level -> suit -> declarer -> result. */
const SYMBOL: Record<string, string> = { C: "♣", D: "♦", H: "♥", S: "♠", NT: "NT" };
function pickContract(level: string, suit: string, declarer: string, result: string) {
  click("+ Add Component");
  click(level);
  click(`${level}${SYMBOL[suit]}`);
  click(`${level}${SYMBOL[suit]}${declarer}`);
  click(result);
}

function setWeight(value: string) {
  fireEvent.change(screen.getByLabelText("Weight percentage"), {
    target: { value },
  });
}

describe("StepWeightedScore", () => {
  it("starts empty with Submit disabled", () => {
    render(<StepWeightedScore onSubmit={vi.fn()} />);
    expect(screen.getByText(/sum to 100%/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();
  });

  it("builds a two-component weighted score and submits it", () => {
    const onSubmit = vi.fn();
    render(<StepWeightedScore onSubmit={onSubmit} />);

    // Component 1: 3NT by N making exactly, 60%.
    pickContract("3", "NT", "N", "=");
    expect(screen.getByText(/Component 1 — Weight/)).toBeInTheDocument();
    expect(screen.getByLabelText("Weight percentage")).toHaveValue(100);
    setWeight("60");
    click("Add Component");
    expect(screen.getByText(/40% remaining/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit" })).toBeDisabled();

    // Component 2: 4♥ by E, down 1 (red suit label), rest of the weight.
    click("+ Add Component");
    click("4");
    click("4♥");
    click("4♥E");
    click("Down");
    click("-1");
    expect(screen.getByLabelText("Weight percentage")).toHaveValue(40);
    click("Add Component");

    expect(screen.getByText("Total: 100%")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "+ Add Component" }),
    ).not.toBeInTheDocument();
    click("Submit");
    expect(onSubmit).toHaveBeenCalledWith([
      { contract: "3NTN=", weight: 60 },
      { contract: "4HE-1", weight: 40 },
    ]);
  });

  it("clamps a tiny weight up to 0.01", () => {
    const onSubmit = vi.fn();
    render(<StepWeightedScore onSubmit={onSubmit} />);
    pickContract("1", "C", "S", "=");
    setWeight("0.001");
    click("Add Component");
    expect(screen.getByText("Total: 0.01%", { exact: false })).toBeInTheDocument();
  });

  it("disables adding a component whose weight is zero or exceeds the remainder", () => {
    render(<StepWeightedScore onSubmit={vi.fn()} />);
    pickContract("2", "S", "W", "=");
    setWeight("101");
    expect(screen.getByRole("button", { name: "Add Component" })).toBeDisabled();
    setWeight("0");
    expect(screen.getByRole("button", { name: "Add Component" })).toBeDisabled();
  });

  it("removes a component", () => {
    render(<StepWeightedScore onSubmit={vi.fn()} />);
    pickContract("2", "D", "S", "=");
    setWeight("50");
    click("Add Component");
    click("Remove component 1");
    expect(screen.getByText(/sum to 100%/)).toBeInTheDocument();
  });

  it("steps back through every phase", () => {
    render(<StepWeightedScore onSubmit={vi.fn()} />);
    click("+ Add Component");
    click("3");
    click("3NT");
    click("3NTN");
    expect(screen.getByText(/Component 1 — Result/)).toBeInTheDocument();

    click("← Back"); // result -> declarer
    expect(screen.getByText(/Component 1 — Declarer/)).toBeInTheDocument();
    click("← Back"); // declarer -> suit
    expect(screen.getByText(/Component 1 — Suit/)).toBeInTheDocument();
    click("← Back"); // suit -> level
    expect(screen.getByText(/Component 1 — Level/)).toBeInTheDocument();
    click("← Back"); // level -> list
    expect(screen.getByText("Weighted Score")).toBeInTheDocument();

    // weight -> level
    pickContract("3", "NT", "N", "=");
    click("← Back");
    expect(screen.getByText(/Component 1 — Level/)).toBeInTheDocument();
  });
});
