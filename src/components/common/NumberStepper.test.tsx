import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NumberStepper from "./NumberStepper";
import { describe, expect, it, vi } from "vitest";

describe("NumberStepper", () => {
  it("renders value correctly", () => {
    render(<NumberStepper value={5} onChange={vi.fn()} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders zeroCharacter when value is 0", () => {
    render(<NumberStepper value={0} zeroCharacter="ZERO" onChange={vi.fn()} />);

    expect(screen.getByText("ZERO")).toBeInTheDocument();
  });

  it("shows + sign when showPlus is enabled", () => {
    render(<NumberStepper value={5} showPlus onChange={vi.fn()} />);

    expect(screen.getByText("+5")).toBeInTheDocument();
  });

  it("does not show + sign when showPlus is false", () => {
    render(<NumberStepper value={5} showPlus={false} onChange={vi.fn()} />);

    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("calls onChange when increment button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<NumberStepper value={5} onChange={onChange} />);

    const increment = screen.getByRole("button", { name: "+" });

    await user.click(increment);

    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("calls onChange when decrement button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<NumberStepper value={5} onChange={onChange} />);

    const decrement = screen.getByRole("button", { name: "−" });

    await user.click(decrement);

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("respects min boundary (disables decrement)", () => {
    render(<NumberStepper value={0} min={0} onChange={vi.fn()} />);

    const decrement = screen.getByRole("button", { name: "−" });

    expect(decrement).toBeDisabled();
  });

  it("respects max boundary (disables increment)", () => {
    render(<NumberStepper value={10} max={10} onChange={vi.fn()} />);

    const increment = screen.getByRole("button", { name: "+" });

    expect(increment).toBeDisabled();
  });

  it("does not go below min when decrementing", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<NumberStepper value={0} min={0} onChange={onChange} />);

    const decrement = screen.getByRole("button", { name: "−" });

    // Even if clicked, component logic clamps internally
    await user.click(decrement);

    expect(onChange).not.toHaveBeenCalled();
  });

  it("clamps value to max when incremented beyond max", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(<NumberStepper value={10} max={10} onChange={onChange} />);

    const increment = screen.getByRole("button", { name: "+" });

    await user.click(increment);

    expect(onChange).not.toHaveBeenCalled();
  });
});
