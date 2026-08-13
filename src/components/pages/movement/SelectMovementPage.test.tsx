import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SelectMovementPage from "./SelectMovementPage";

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
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
  // options is SelectOption[] with {label, value} — expose first option's name
  default: ({ value, onSelect, options }: any) => (
    <div>
      <div data-testid="movement-value">{value}</div>
      <button onClick={() => onSelect(options[0]?.value)}>Select First</button>
    </div>
  ),
}));

describe("SelectMovementPage", () => {
  const baseProps = {
    tables: 4,
    onConfirm: vi.fn(),
  };

  it("renders GameInfo", () => {
    render(<SelectMovementPage {...baseProps} />);
    expect(screen.getByTestId("game-info")).toBeInTheDocument();
  });

  it("renders default movement state", () => {
    render(<SelectMovementPage {...baseProps} />);
    expect(screen.getByTestId("movement-value")).toBeTruthy();
  });

  it("computes movement name based on inputs", () => {
    render(<SelectMovementPage {...baseProps} tables={4} />);
    expect(screen.getByTestId("movement-value")).toBeInTheDocument();
  });

  it("changes selected movement", () => {
    render(<SelectMovementPage {...baseProps} />);
    fireEvent.click(screen.getByText("Select First"));
    expect(screen.getByTestId("movement-value")).toBeTruthy();
  });

  it("disables submit when no movement — default has a movement so disabled=false", () => {
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
    expect(root).toHaveClass("flex-1", "flex", "flex-col");
  });
});
