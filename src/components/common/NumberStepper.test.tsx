import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import NumberStepper from "./NumberStepper";

afterEach(() => {
  vi.useRealTimers();
});

describe("NumberStepper", () => {
  it("increments and decrements via press-and-release", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={2} onChange={onChange} />);

    const [decrement, increment] = screen.getAllByRole("button");

    fireEvent.mouseDown(increment);
    expect(onChange).toHaveBeenLastCalledWith(3);
    fireEvent.mouseUp(increment);

    fireEvent.mouseDown(decrement);
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.mouseUp(decrement);
  });

  it("clamps to max and disables the increment button at max", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={5} max={5} onChange={onChange} />);

    const increment = screen.getByRole("button", { name: "+" });
    expect(increment).toBeDisabled();

    const decrement = screen.getByRole("button", { name: "−" });
    expect(decrement).not.toBeDisabled();
  });

  it("clamps to min and disables the decrement button at min", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={-3} min={-3} onChange={onChange} />);

    const decrement = screen.getByRole("button", { name: "−" });
    expect(decrement).toBeDisabled();
  });

  it("shows the zero character when value is zero", () => {
    render(<NumberStepper value={0} onChange={vi.fn()} />);
    expect(screen.getByText("=")).toBeInTheDocument();
  });

  it("uses a custom zero character", () => {
    render(<NumberStepper value={0} zeroCharacter="Made" onChange={vi.fn()} />);
    expect(screen.getByText("Made")).toBeInTheDocument();
  });

  it("shows a plus prefix for positive values when showPlus is set", () => {
    render(<NumberStepper value={3} showPlus onChange={vi.fn()} />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });

  it("shows positive values without a prefix when showPlus is not set", () => {
    render(<NumberStepper value={3} onChange={vi.fn()} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders negative values with the minus sign", () => {
    render(<NumberStepper value={-2} onChange={vi.fn()} />);
    expect(screen.getByText("-2")).toBeInTheDocument();
  });

  it("repeatedly adjusts while held down (touch)", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<NumberStepper value={0} onChange={onChange} />);

    const increment = screen.getByRole("button", { name: "+" });

    fireEvent.touchStart(increment);
    // immediate adjust
    expect(onChange).toHaveBeenCalledTimes(1);

    // delay before repeating starts
    vi.advanceTimersByTime(400);
    // first tick
    expect(onChange).toHaveBeenCalledTimes(2);
    // subsequent accelerating ticks
    vi.advanceTimersByTime(300);
    expect(onChange.mock.calls.length).toBeGreaterThan(2);

    fireEvent.touchEnd(increment);
    const callsAfterStop = onChange.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(callsAfterStop);
  });

  it("is a no-op when released without being pressed", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={0} onChange={onChange} />);

    const increment = screen.getByRole("button", { name: "+" });
    // No preceding mouseDown, so both timers are null when stopAdjusting runs.
    fireEvent.mouseUp(increment);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("supports touch on the decrement button", () => {
    const onChange = vi.fn();
    render(<NumberStepper value={0} onChange={onChange} />);

    const decrement = screen.getByRole("button", { name: "−" });
    fireEvent.touchStart(decrement);
    expect(onChange).toHaveBeenLastCalledWith(-1);
    fireEvent.touchEnd(decrement);
  });

  it("stops adjusting when the pointer leaves the button", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    render(<NumberStepper value={0} onChange={onChange} />);

    const increment = screen.getByRole("button", { name: "+" });
    fireEvent.mouseDown(increment);
    fireEvent.mouseLeave(increment);

    const calls = onChange.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(calls);
  });
});
