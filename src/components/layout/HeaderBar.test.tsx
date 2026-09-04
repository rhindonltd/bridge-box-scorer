import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { HeaderBar } from "./HeaderBar";

describe("HeaderBar", () => {
  it("renders only the title when no optional props are supplied", () => {
    render(<HeaderBar headerTitle="Settings" />);

    expect(screen.getByText("Settings")).toBeInTheDocument();
    // No back affordance rendered.
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
