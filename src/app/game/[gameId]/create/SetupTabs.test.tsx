import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SetupTabs } from "./SetupTabs";

describe("SetupTabs", () => {
  it("renders all three tabs", () => {
    render(<SetupTabs active="tables" onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: "Tables" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Movement" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Timer" })).toBeInTheDocument();
  });

  it("marks the active tab as selected", () => {
    render(<SetupTabs active="movements" onSelect={() => {}} />);

    expect(screen.getByRole("tab", { name: "Movement" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Tables" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
    expect(screen.getByRole("tab", { name: "Timer" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("calls onSelect with the step when a tab is clicked", () => {
    const onSelect = vi.fn();
    render(<SetupTabs active="tables" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("tab", { name: "Timer" }));
    expect(onSelect).toHaveBeenCalledWith("timer");

    fireEvent.click(screen.getByRole("tab", { name: "Movement" }));
    expect(onSelect).toHaveBeenCalledWith("movements");
  });
});
