import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import MovementOptionsPage from "./MovementOptionsPage";

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
}));

vi.mock("@/components/layout/FormCardLayout", () => ({
  default: ({ children, onSubmit }: any) => (
    <form
      data-testid="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
    >
      {children}
      <button type="submit">Submit</button>
    </form>
  ),
}));

vi.mock("@/components/common/SelectField", () => ({
  // options is SelectOption[] — render first option's label as current value
  default: ({ value, onSelect, options }: any) => (
    <div>
      <div data-testid="select-value">{value}</div>
      <button onClick={() => onSelect(options[1]?.value)}>Change Select</button>
    </div>
  ),
}));

describe("MovementOptionsPage", () => {
  const baseProps = {
    tables: 2,
    onSubmit: vi.fn(),
  };

  it("renders GameInfo", () => {
    render(<MovementOptionsPage {...baseProps} />);
    expect(screen.getByTestId("game-info")).toBeInTheDocument();
  });

  it("renders FormCardLayout", () => {
    render(<MovementOptionsPage {...baseProps} />);
    expect(screen.getByTestId("form")).toBeInTheDocument();
  });

  it("generates missing pair options correctly — default is 'None'", () => {
    render(<MovementOptionsPage {...baseProps} />);
    expect(screen.getByTestId("select-value")).toHaveTextContent("None");
  });

  it("submits form with selected values", () => {
    const fn = vi.fn();
    render(<MovementOptionsPage {...baseProps} onSubmit={fn} />);
    fireEvent.submit(screen.getByTestId("form"));
    expect(fn).toHaveBeenCalledWith({
      missingPair: "None",
      arrowSwitchedRounds: 0,
    });
  });

  it("applies page layout classes", () => {
    const { container } = render(<MovementOptionsPage {...baseProps} />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("flex-1", "flex", "flex-col");
  });
});
