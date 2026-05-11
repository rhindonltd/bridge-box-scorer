import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AwaitingMovementPage } from "./AwaitingMovementPage";

// Mock child components to isolate this page
vi.mock("@/components/common/SectionInfo", () => ({
  SectionInfo: () => <div data-testid="section-info" />,
}));

vi.mock("@/components/join/AwaitingMovement", () => ({
  AwaitingMovement: () => <div data-testid="awaiting-movement" />,
}));

describe("AwaitingMovementPage", () => {
  it("renders SectionInfo", () => {
    render(<AwaitingMovementPage />);

    expect(screen.getByTestId("section-info")).toBeInTheDocument();
  });

  it("renders AwaitingMovement component", () => {
    render(<AwaitingMovementPage />);

    expect(screen.getByTestId("awaiting-movement")).toBeInTheDocument();
  });

  it("applies page layout classes", () => {
    const { container } = render(<AwaitingMovementPage />);

    const root = container.firstChild as HTMLElement;

    expect(root).toHaveClass("h-screen", "flex", "flex-col", "bg-gray-100");
  });

  // it("wraps SectionInfo in full width container", () => {
  //     render(<AwaitingMovementPage />);
  //
  //     const section = screen.getByTestId("section-info").parentElement;
  //
  //     expect(section?.parentElement).toHaveClass("w-full");
  // });
});
