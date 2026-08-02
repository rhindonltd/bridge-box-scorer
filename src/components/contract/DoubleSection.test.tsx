import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DoubleSection from "./DoubleSection";

// Mock Section
vi.mock("@/components/contract/Section", () => ({
  default: ({ children, title, className }: any) => (
    <div data-testid="section" className={className}>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

// Mock ToggleButton
vi.mock("@/components/common/ToggleButton", () => ({
  ToggleButton: ({ children, active, onClick, fullWidth, flex }: any) => (
    <button
      onClick={onClick}
      data-active={active}
      data-full-width={fullWidth}
      data-flex={flex}
    >
      {children}
    </button>
  ),
}));

describe("DoubleSection", () => {
  it("renders all doubling options", () => {
    render(<DoubleSection dbl={null} onDblSelected={vi.fn()} />);

    expect(screen.getByText("None")).toBeInTheDocument();
    expect(screen.getByText("X")).toBeInTheDocument();
    expect(screen.getByText("XX")).toBeInTheDocument();
  });

  it("marks None as active when dbl is empty string", () => {
    render(<DoubleSection dbl="" onDblSelected={vi.fn()} />);

    expect(screen.getByText("None")).toHaveAttribute("data-active", "true");
  });

  it("marks X as active", () => {
    render(<DoubleSection dbl="X" onDblSelected={vi.fn()} />);

    expect(screen.getByText("X")).toHaveAttribute("data-active", "true");
  });

  it("marks XX as active", () => {
    render(<DoubleSection dbl="XX" onDblSelected={vi.fn()} />);

    expect(screen.getByText("XX")).toHaveAttribute("data-active", "true");
  });

  it("calls onDblSelected with empty string", () => {
    const fn = vi.fn();

    render(<DoubleSection dbl={null} onDblSelected={fn} />);

    fireEvent.click(screen.getByText("None"));

    expect(fn).toHaveBeenCalledWith("");
  });

  it("calls onDblSelected with X", () => {
    const fn = vi.fn();

    render(<DoubleSection dbl={null} onDblSelected={fn} />);

    fireEvent.click(screen.getByText("X"));

    expect(fn).toHaveBeenCalledWith("X");
  });

  it("calls onDblSelected with XX", () => {
    const fn = vi.fn();

    render(<DoubleSection dbl={null} onDblSelected={fn} />);

    fireEvent.click(screen.getByText("XX"));

    expect(fn).toHaveBeenCalledWith("XX");
  });

  it("passes className to Section", () => {
    render(
      <DoubleSection
        className="test-class"
        dbl={null}
        onDblSelected={vi.fn()}
      />,
    );

    expect(screen.getByTestId("section")).toHaveClass("test-class");
  });

  it("passes fullWidth prop to None button", () => {
    render(<DoubleSection dbl={null} onDblSelected={vi.fn()} />);

    expect(screen.getByText("None")).toHaveAttribute("data-full-width", "true");
  });

  it("passes fullWidth prop to X and XX buttons", () => {
    render(<DoubleSection dbl={null} onDblSelected={vi.fn()} />);

    expect(screen.getByText("X")).toHaveAttribute("data-full-width", "true");

    expect(screen.getByText("XX")).toHaveAttribute("data-full-width", "true");
  });
});
