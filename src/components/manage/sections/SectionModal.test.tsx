import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SectionModal } from "./SectionModal";

describe("SectionModal", () => {
  it("renders a single field in one-field mode and returns the new label", () => {
    const onConfirm = vi.fn();
    render(
      <SectionModal
        open
        newSectionLetter="C"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    // Only the new-section field is present.
    expect(screen.getByLabelText("New section (C)")).toHaveValue("C");
    expect(screen.queryByLabelText(/Existing section/)).toBeNull();

    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "Red" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onConfirm).toHaveBeenCalledWith({ newLabel: "Red" });
  });

  it("renders both fields in two-field mode and returns both labels", () => {
    const onConfirm = vi.fn();
    render(
      <SectionModal
        open
        existingSection={{ letter: "A", label: "A" }}
        newSectionLetter="B"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    const existing = screen.getByLabelText("Existing section (A)");
    const added = screen.getByLabelText("New section (B)");
    expect(existing).toHaveValue("A");
    expect(added).toHaveValue("B");

    fireEvent.change(existing, { target: { value: "North" } });
    fireEvent.change(added, { target: { value: "South" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onConfirm).toHaveBeenCalledWith({
      newLabel: "South",
      existingLabel: "North",
    });
  });

  it("disables Add section when a required label is blank", () => {
    render(
      <SectionModal
        open
        newSectionLetter="B"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("New section (B)"), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(
      <SectionModal
        open
        newSectionLetter="B"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("renders nothing when closed", () => {
    render(
      <SectionModal
        open={false}
        newSectionLetter="B"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
