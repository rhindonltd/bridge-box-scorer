import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DeclarerSection from "./DeclarerSection";
import { Directions } from "@/model/common";

// Mock ToggleButton
vi.mock("@/components/common/ToggleButton", () => ({
  ToggleButton: ({ children, active, onClick }: any) => (
    <button data-active={active} onClick={onClick}>
      {children}
    </button>
  ),
}));

describe("DeclarerSection", () => {
  it("renders all directions in NSEW order", () => {
    render(<DeclarerSection declarer={null} onDeclarerSelected={vi.fn()} />);

    expect(screen.getByText("N")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("E")).toBeInTheDocument();
    expect(screen.getByText("W")).toBeInTheDocument();
  });

  it("marks selected declarer as active", () => {
    render(<DeclarerSection declarer="N" onDeclarerSelected={vi.fn()} />);

    expect(screen.getByText("N")).toHaveAttribute("data-active", "true");
    expect(screen.getByText("S")).toHaveAttribute("data-active", "false");
  });

  it("calls onDeclarerSelected when clicked", () => {
    const fn = vi.fn();

    render(<DeclarerSection declarer={null} onDeclarerSelected={fn} />);

    fireEvent.click(screen.getByText("E"));

    expect(fn).toHaveBeenCalledWith("E");
  });

  it("passes className to wrapper", () => {
    const { container } = render(
      <DeclarerSection
        className="test-class"
        declarer={null}
        onDeclarerSelected={vi.fn()}
      />,
    );

    expect(container.firstChild).toHaveClass("test-class");
  });
});
