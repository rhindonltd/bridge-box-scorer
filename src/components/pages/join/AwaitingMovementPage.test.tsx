import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwaitingMovementPage } from "./AwaitingMovementPage";

vi.mock("@/components/common/GameInfo", () => ({
  GameInfo: () => <div data-testid="game-info" />,
}));

vi.mock("@/components/join/AwaitingMovement", () => ({
  AwaitingMovement: () => <div data-testid="awaiting-movement" />,
}));

describe("AwaitingMovementPage", () => {
  it("renders GameInfo", () => {
    render(<AwaitingMovementPage />);
    expect(screen.getByTestId("game-info")).toBeInTheDocument();
  });

  it("renders AwaitingMovement component", () => {
    render(<AwaitingMovementPage />);
    expect(screen.getByTestId("awaiting-movement")).toBeInTheDocument();
  });

  it("applies page layout classes", () => {
    const { container } = render(<AwaitingMovementPage />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass("flex-1", "flex", "flex-col");
  });
});
