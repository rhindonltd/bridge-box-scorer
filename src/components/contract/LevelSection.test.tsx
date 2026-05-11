import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LevelSection from "./LevelSection";
import { Levels } from "@/model/contract";

// Mock Section
vi.mock("@/components/contract/Section", () => ({
  default: ({ children, title, className, gridCols }: any) => (
    <div data-testid="section" className={className} data-grid-cols={gridCols}>
      <div>{title}</div>
      {children}
    </div>
  ),
}));

// Mock ToggleButton
vi.mock("@/components/common/ToggleButton", () => ({
  ToggleButton: ({ children, active, onClick }: any) => (
    <button onClick={onClick} data-active={active}>
      {children}
    </button>
  ),
}));

describe("LevelSection", () => {
  it("renders all levels", () => {
    render(<LevelSection level={null} onLevelSelected={vi.fn()} />);

    Levels.forEach((l) => {
      expect(screen.getByText(String(l))).toBeInTheDocument();
    });
  });

  it("marks selected level as active", () => {
    const selected = Levels[0];

    render(<LevelSection level={selected} onLevelSelected={vi.fn()} />);

    expect(screen.getByText(String(selected))).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("calls onLevelSelected when a level is clicked", () => {
    const fn = vi.fn();

    render(<LevelSection level={null} onLevelSelected={fn} />);

    const selected = Levels[1];

    fireEvent.click(screen.getByText(String(selected)));

    expect(fn).toHaveBeenCalledWith(selected);
  });

  it("passes className to Section", () => {
    render(
      <LevelSection
        className="test-class"
        level={null}
        onLevelSelected={vi.fn()}
      />,
    );

    expect(screen.getByTestId("section")).toHaveClass("test-class");
  });

  it("passes gridCols=4 to Section", () => {
    render(<LevelSection level={null} onLevelSelected={vi.fn()} />);

    expect(screen.getByTestId("section")).toHaveAttribute(
      "data-grid-cols",
      "4",
    );
  });

  it("renders section title", () => {
    render(<LevelSection level={null} onLevelSelected={vi.fn()} />);

    expect(screen.getByText("Level")).toBeInTheDocument();
  });
});
