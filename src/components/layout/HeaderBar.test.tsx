import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockOnBack = vi.fn();
vi.mock("@/hooks/useBackNavigation", () => ({
  useBackNavigation: (fallback?: string) => {
    mockFallback = fallback;
    return { onBack: mockOnBack };
  },
}));
let mockFallback: string | undefined;

import { HeaderBar } from "./HeaderBar";

describe("HeaderBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFallback = undefined;
  });

  it("renders a default back button (pop the stack) when no back props are supplied", () => {
    render(<HeaderBar headerTitle="Settings" />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Go back"));
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });

  it("passes backFallbackHref to the back-navigation hook", () => {
    render(<HeaderBar headerTitle="Settings" backFallbackHref="/settings" />);
    expect(mockFallback).toBe("/settings");
  });

  it("hides the back arrow when hideBack is set", () => {
    render(<HeaderBar headerTitle="Root" hideBack />);
    expect(screen.queryByLabelText("Go back")).not.toBeInTheDocument();
  });

  it("renders a back link when backHref is provided", () => {
    render(<HeaderBar headerTitle="Manage" backHref="/home" />);

    const link = screen.getByLabelText("Go back");
    expect(link).toHaveAttribute("href", "/home");
  });

  it("renders a back button and invokes backAction when clicked", () => {
    const backAction = vi.fn();
    render(<HeaderBar headerTitle="Game" backAction={backAction} />);

    fireEvent.click(screen.getByLabelText("Go back"));
    expect(backAction).toHaveBeenCalled();
    expect(mockOnBack).not.toHaveBeenCalled();
  });

  it("renders exactly one back control and prefers backAction over backHref", () => {
    const backAction = vi.fn();
    render(
      <HeaderBar headerTitle="Game" backAction={backAction} backHref="/home" />,
    );

    const controls = screen.getAllByLabelText("Go back");
    expect(controls).toHaveLength(1);
    // The single control is the button (backAction), not a link.
    fireEvent.click(controls[0]);
    expect(backAction).toHaveBeenCalled();
  });

  it("renders subtitles and right-aligned content when provided", () => {
    render(
      <HeaderBar
        headerTitle="Event"
        headerSubtitle="Session 1"
        headerSubtitle2="Section A"
        headerRight={<span>Pair 3</span>}
      />,
    );

    expect(screen.getByText("Session 1")).toBeInTheDocument();
    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Pair 3")).toBeInTheDocument();
  });
});
