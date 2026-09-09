import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SectionPills } from "./SectionPills";

const sections = [
  { section: "A", label: "A" },
  { section: "B", label: "Blue" },
];

describe("SectionPills", () => {
  it("renders a pill per section and marks the active one", () => {
    render(
      <SectionPills sections={sections} selected="A" onSelect={vi.fn()} />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "Section A" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.getByRole("tab", { name: /Section B — Blue/ }),
    ).toHaveAttribute("aria-selected", "false");
  });

  it("calls onSelect with the section when a pill is clicked", () => {
    const onSelect = vi.fn();
    render(<SectionPills sections={sections} selected="A" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("tab", { name: /Section B/ }));
    expect(onSelect).toHaveBeenCalledWith("B");
  });

  it("shows the Add section pill only when onAddSection is provided", () => {
    const { rerender } = render(
      <SectionPills sections={sections} selected="A" onSelect={vi.fn()} />,
    );
    expect(
      screen.queryByRole("button", { name: /Add section/ }),
    ).toBeNull();

    const onAddSection = vi.fn();
    rerender(
      <SectionPills
        sections={sections}
        selected="A"
        onSelect={vi.fn()}
        onAddSection={onAddSection}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Add section/ }));
    expect(onAddSection).toHaveBeenCalledTimes(1);
  });

  it("hides the section pill and shows 'Split into sections' for a single section", () => {
    const onAddSection = vi.fn();
    render(
      <SectionPills
        sections={[{ section: "A", label: "A" }]}
        selected="A"
        onSelect={vi.fn()}
        onAddSection={onAddSection}
      />,
    );

    // No "Section A" tab when there's only one section.
    expect(screen.queryByRole("tab")).toBeNull();
    // A single "Split into sections" pill opens the add flow.
    const split = screen.getByRole("button", { name: /Split into sections/ });
    fireEvent.click(split);
    expect(onAddSection).toHaveBeenCalledTimes(1);
  });

  it("renders nothing interactive for a single section on a live screen (no add)", () => {
    render(
      <SectionPills
        sections={[{ section: "A", label: "A" }]}
        selected="A"
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByRole("tab")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
