import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NumberStepperField } from "./NumberStepperField";

/**
 * Mock NumberStepper so we only test wiring + props
 */
vi.mock("@/components/common/NumberStepper", () => ({
  default: ({ value, onChange, min }: any) => (
    <div data-testid="number-stepper">
      <span>value:{value}</span>
      <span>min:{min}</span>
      <button onClick={() => onChange(value + 1)}>mock increment</button>
    </div>
  ),
}));

describe("NumberStepperField", () => {
  it("renders label correctly", () => {
    render(
      <NumberStepperField label="Score" value={5} onChange={vi.fn()} min={0} />,
    );

    expect(screen.getByText("Score")).toBeInTheDocument();
  });

  it("passes value and min to NumberStepper", () => {
    render(
      <NumberStepperField label="Score" value={7} onChange={vi.fn()} min={2} />,
    );

    expect(screen.getByText("value:7")).toBeInTheDocument();
    expect(screen.getByText("min:2")).toBeInTheDocument();
  });

  it("calls onChange when NumberStepper triggers change", () => {
    const onChange = vi.fn();

    render(
      <NumberStepperField
        label="Score"
        value={3}
        onChange={onChange}
        min={0}
      />,
    );

    screen.getByText("mock increment").click();

    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("renders correct structure", () => {
    render(
      <NumberStepperField
        label="Label Test"
        value={1}
        onChange={vi.fn()}
        min={0}
      />,
    );

    const label = screen.getByText("Label Test");

    expect(label.tagName).toBe("LABEL");
    expect(label).toHaveClass("text-sm");
    expect(label).toHaveClass("font-semibold");
  });
});
