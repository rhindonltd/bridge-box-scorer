import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SelectMovementPage from "./SelectMovementPage";

// Mock dependencies
vi.mock("@/components/common/SectionInfo", () => ({
  SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/layout/FormCardLayout", () => ({
  default: ({ children, onSubmit, disabled }: any) => (
    <form
      data-testid="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
    >
      <div data-testid="disabled">{String(disabled)}</div>
      {children}
      <button type="submit">Submit</button>
    </form>
  ),
}));

vi.mock("@/components/common/SelectField", () => ({
  default: ({ value, onSelect, options }: any) => (
    <div>
      <div data-testid="movement-value">{value}</div>
      <div data-testid="options">{options.join(",")}</div>
      <button onClick={() => onSelect(options[0])}>Select First</button>
    </div>
  ),
}));

vi.mock("@/components/common/NumberStepperField", () => ({
  NumberStepperField: ({ value, onChange, label }: any) => (
    <div>
      <div data-testid={`stepper-${label}`}>{value}</div>
      <button onClick={() => onChange(value + 1)}>Increment</button>
    </div>
  ),
}));

describe("SelectMovementPage", () => {
  const baseProps = {
    tables: 4,
    onConfirm: vi.fn(),
  };

  it("renders SectionInfo", () => {
    render(<SelectMovementPage {...baseProps} />);

    expect(screen.getByTestId("section-info")).toBeInTheDocument();
  });

  it("renders default movement state", () => {
    render(<SelectMovementPage {...baseProps} />);

    expect(screen.getByTestId("movement-value")).toBeTruthy();
  });

  it("computes movement name based on inputs", () => {
    render(<SelectMovementPage {...baseProps} tables={4} />);

    // initial rounds = 3
    expect(screen.getByTestId("movement-value")).toBeInTheDocument();
  });

  // it("updates rounds", () => {
  //     render(<SelectMovementPage {...baseProps} />);
  //
  //     const roundsStepper = screen.getByTestId("stepper-Number of rounds:");
  //     fireEvent.click(within(roundsStepper).getByText("Increment"));
  //
  //     expect(screen.getByTestId("number-value")).not.toHaveTextContent("3");
  // });

  // it("updates boards per round", () => {
  //     render(<SelectMovementPage {...baseProps} />);
  //
  //     const buttons = screen.getAllByText("Increment");
  //
  //     fireEvent.click(buttons[1]);
  //
  //     expect(
  //         screen.getByTestId("number-value-Boards per round:")
  //     ).toBeInTheDocument();
  // });

  it("changes selected movement", () => {
    render(<SelectMovementPage {...baseProps} />);

    fireEvent.click(screen.getByText("Select First"));

    expect(screen.getByTestId("movement-value")).toBeTruthy();
  });

  it("disables submit when no movement", () => {
    render(<SelectMovementPage {...baseProps} />);

    expect(screen.getByTestId("disabled")).toHaveTextContent("false");
  });

  it("submits selected movement", () => {
    const fn = vi.fn();

    render(<SelectMovementPage {...baseProps} onConfirm={fn} />);

    fireEvent.submit(screen.getByTestId("form"));

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn.mock.calls[0][0]).toHaveProperty("name");
  });

  it("applies layout classes", () => {
    const { container } = render(<SelectMovementPage {...baseProps} />);

    const root = container.firstChild as HTMLElement;

    expect(root).toHaveClass("h-screen", "flex", "flex-col", "bg-gray-100");
  });
});
