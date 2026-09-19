import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useState } from "react";
import { StepperInput } from "./StepperInput";

/**
 * A controlled wrapper: StepperInput reads `value` from props and reports
 * changes via `onChange`, so we hold the value in state here to mirror real
 * usage (and let clamping/wrapping be observed across re-renders).
 */
function Controlled({
  initial = 5,
  onChangeSpy,
  ...props
}: {
  initial?: number;
  onChangeSpy?: (v: number) => void;
} & Partial<React.ComponentProps<typeof StepperInput>>) {
  const [value, setValue] = useState(initial);
  return (
    <StepperInput
      label="Minutes"
      value={value}
      onChange={(v) => {
        setValue(v);
        onChangeSpy?.(v);
      }}
      {...props}
    />
  );
}

describe("StepperInput", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllTimers();
  });

  const inc = () => screen.getByLabelText("Increase Minutes");
  const dec = () => screen.getByLabelText("Decrease Minutes");
  const field = () => screen.getByLabelText("Minutes") as HTMLInputElement;

  it("increments and decrements by the step, clamping at min and max", () => {
    const spy = vi.fn();
    render(
      <Controlled initial={0} min={0} max={2} step={1} onChangeSpy={spy} />,
    );

    // At min: decrease is disabled.
    expect(dec()).toBeDisabled();

    // Step up to max.
    act(() => fireEvent.pointerDown(inc()));
    act(() => fireEvent.pointerUp(inc()));
    expect(spy).toHaveBeenLastCalledWith(1);

    act(() => fireEvent.pointerDown(inc()));
    act(() => fireEvent.pointerUp(inc()));
    expect(spy).toHaveBeenLastCalledWith(2);

    // At max: increase is disabled, clamp holds.
    expect(inc()).toBeDisabled();
    expect(field()).toHaveValue(2);

    // Step back down.
    act(() => fireEvent.pointerDown(dec()));
    act(() => fireEvent.pointerUp(dec()));
    expect(spy).toHaveBeenLastCalledWith(1);
  });

  it("wraps around min/max when wrap is enabled", () => {
    const spy = vi.fn();
    // seconds-style field: 0 → 15 → 30 → 45 → 0
    render(
      <Controlled
        initial={45}
        min={0}
        max={45}
        step={15}
        wrap
        onChangeSpy={spy}
      />,
    );

    // At max but wrap enabled -> increase stays enabled and wraps to min.
    expect(inc()).not.toBeDisabled();
    act(() => fireEvent.pointerDown(inc()));
    act(() => fireEvent.pointerUp(inc()));
    expect(spy).toHaveBeenLastCalledWith(0);

    // Decreasing from min wraps to max.
    act(() => fireEvent.pointerDown(dec()));
    act(() => fireEvent.pointerUp(dec()));
    expect(spy).toHaveBeenLastCalledWith(45);
  });

  it("auto-repeats while the button is held and stops on pointer up", () => {
    const spy = vi.fn();
    render(
      <Controlled initial={0} min={0} max={100} step={1} onChangeSpy={spy} />,
    );

    act(() => fireEvent.pointerDown(inc())); // immediate step -> 1
    expect(spy).toHaveBeenLastCalledWith(1);

    // 400ms until repeat kicks in, then ~300ms cadence accelerating.
    act(() => vi.advanceTimersByTime(400)); // first repeat tick
    act(() => vi.advanceTimersByTime(300));
    act(() => vi.advanceTimersByTime(270));
    const countWhileHeld = spy.mock.calls.length;
    expect(countWhileHeld).toBeGreaterThan(1);

    // Release stops further ticks.
    act(() => fireEvent.pointerUp(inc()));
    act(() => vi.advanceTimersByTime(1000));
    expect(spy.mock.calls.length).toBe(countWhileHeld);
  });

  it("stops auto-repeat when the pointer leaves the button", () => {
    const spy = vi.fn();
    render(<Controlled initial={0} min={0} max={100} onChangeSpy={spy} />);

    act(() => fireEvent.pointerDown(inc()));
    act(() => vi.advanceTimersByTime(400));
    const n = spy.mock.calls.length;

    act(() => fireEvent.pointerLeave(inc()));
    act(() => vi.advanceTimersByTime(1000));
    expect(spy.mock.calls.length).toBe(n);

    // pointerCancel also stops (fresh press).
    act(() => fireEvent.pointerDown(inc()));
    act(() => vi.advanceTimersByTime(400));
    const m = spy.mock.calls.length;
    act(() => fireEvent.pointerCancel(inc()));
    act(() => vi.advanceTimersByTime(1000));
    expect(spy.mock.calls.length).toBe(m);
  });

  it("commits typed numbers as you type and clamps them", () => {
    const spy = vi.fn();
    render(<Controlled initial={5} min={0} max={10} onChangeSpy={spy} />);

    fireEvent.change(field(), { target: { value: "8" } });
    expect(spy).toHaveBeenLastCalledWith(8);

    // Above max -> clamped to max on commit.
    fireEvent.change(field(), { target: { value: "99" } });
    expect(spy).toHaveBeenLastCalledWith(10);
  });

  it("allows clearing the field while editing and falls back to min on blur", () => {
    const spy = vi.fn();
    render(<Controlled initial={5} min={2} max={10} onChangeSpy={spy} />);

    // Clearing shows empty (draft), does not commit yet.
    fireEvent.change(field(), { target: { value: "" } });
    expect(field()).toHaveValue(null);

    // Blur with empty draft commits the clamped minimum.
    fireEvent.blur(field());
    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it("commits a non-empty draft on blur", () => {
    const spy = vi.fn();
    render(<Controlled initial={5} min={0} max={10} onChangeSpy={spy} />);

    // Type an invalid (non-numeric) value: it becomes the draft but is not
    // committed on change. On blur, Number("") style parse -> NaN -> min.
    fireEvent.change(field(), { target: { value: "abc" } });
    // draft is shown, no commit happened for the non-numeric change.
    expect(field()).toHaveValue(null); // number input rejects "abc" -> ""
    fireEvent.blur(field());
    // draft was "" (number input), so blur commits min (0).
    expect(spy).toHaveBeenLastCalledWith(0);
  });

  it("re-commits the numeric draft on blur", () => {
    const spy = vi.fn();
    render(<Controlled initial={5} min={0} max={10} onChangeSpy={spy} />);

    // Typing a valid number sets a non-empty, non-null draft (and commits it).
    fireEvent.change(field(), { target: { value: "7" } });
    expect(spy).toHaveBeenLastCalledWith(7);

    spy.mockClear();
    // Blur with a non-empty draft hits the `draft !== null` commit branch.
    fireEvent.blur(field());
    expect(spy).toHaveBeenLastCalledWith(7);
  });

  it("does nothing on blur when the field was never edited", () => {
    const spy = vi.fn();
    render(<Controlled initial={5} onChangeSpy={spy} />);
    // draft stays null: blur takes neither the empty nor the non-null branch.
    fireEvent.blur(field());
    expect(spy).not.toHaveBeenCalled();
  });

  it("selects the text on focus", () => {
    render(<Controlled initial={5} />);
    const select = vi.spyOn(field(), "select");
    fireEvent.focus(field());
    expect(select).toHaveBeenCalled();
  });

  it("is fully disabled when disabled is set", () => {
    render(<Controlled initial={5} disabled />);
    expect(field()).toBeDisabled();
    expect(inc()).toBeDisabled();
    expect(dec()).toBeDisabled();
  });

  it("renders a read-only field with no stepper buttons and ignores edits", () => {
    const spy = vi.fn();
    render(<Controlled initial={5} readOnly onChangeSpy={spy} />);

    expect(field()).toHaveAttribute("readonly");
    expect(screen.queryByLabelText("Increase Minutes")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Decrease Minutes")).not.toBeInTheDocument();

    // readOnly short-circuits change/blur/focus handlers.
    const select = vi.spyOn(field(), "select");
    fireEvent.focus(field());
    expect(select).not.toHaveBeenCalled();
    fireEvent.change(field(), { target: { value: "9" } });
    fireEvent.blur(field());
    expect(spy).not.toHaveBeenCalled();
  });

  it("renders an optional suffix inside the field", () => {
    render(<Controlled initial={5} suffix="m" />);
    expect(screen.getByText("m")).toBeInTheDocument();
  });
});
