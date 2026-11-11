import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SectionModal } from "./SectionModal";

const single = [{ letter: "A", label: "A", tables: 4 }];
const multi = [
  { letter: "A", label: "A", tables: 6 },
  { letter: "B", label: "B", tables: 4 },
];

describe("SectionModal", () => {
  it("defaults a single-section game to Split (minimum 2 tables each side)", () => {
    const onConfirm = vi.fn();
    render(
      <SectionModal
        open
        sections={single}
        newSectionLetter="B"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    // A 4-table section splits 2/2; the stepper defaults to the minimum 2 and
    // cannot go below it.
    const stepper = screen.getByLabelText("Tables in new section");
    expect(stepper).toHaveValue(2);
    expect(stepper).toHaveAttribute("min", "2");
    expect(stepper).toHaveAttribute("max", "2");

    fireEvent.change(screen.getByLabelText("Section A name"), {
      target: { value: "North" },
    });
    fireEvent.change(screen.getByLabelText("New section (B) name"), {
      target: { value: "South" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Split" }));

    expect(onConfirm).toHaveBeenCalledWith({
      mode: "split",
      from: "A",
      tablesToNewSection: 2,
      newLabel: "South",
      fromLabel: "North",
    });
  });

  it("adds a brand-new section (first add, two-field) when Add new is chosen", () => {
    const onConfirm = vi.fn();
    render(
      <SectionModal
        open
        sections={single}
        newSectionLetter="B"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Add new" }));

    const existing = screen.getByLabelText("Existing section (A)");
    const added = screen.getByLabelText("New section (B)");
    fireEvent.change(existing, { target: { value: "North" } });
    fireEvent.change(added, { target: { value: "South" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onConfirm).toHaveBeenCalledWith({
      mode: "add",
      newLabel: "South",
      existingLabel: "North",
    });
  });

  it("defaults a multi-section game to Add (one field) and returns an add result", () => {
    const onConfirm = vi.fn();
    render(
      <SectionModal
        open
        sections={multi}
        newSectionLetter="C"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("New section (C)")).toHaveValue("C");
    expect(screen.queryByLabelText(/Existing section/)).toBeNull();

    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "Red" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(onConfirm).toHaveBeenCalledWith({ mode: "add", newLabel: "Red" });
  });

  it("lets a multi-section game split a chosen section", () => {
    const onConfirm = vi.fn();
    render(
      <SectionModal
        open
        sections={multi}
        newSectionLetter="C"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Split existing" }));

    // Both A (6) and B (4) are splittable, so a section picker is shown.
    fireEvent.change(screen.getByLabelText("Section to split"), {
      target: { value: "B" },
    });
    // B has 4 tables, so the only valid split is 2/2 (min 2 each side).
    fireEvent.change(screen.getByLabelText("Section B name"), {
      target: { value: "Blue" },
    });
    fireEvent.change(screen.getByLabelText("New section (C) name"), {
      target: { value: "Green" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Split" }));

    expect(onConfirm).toHaveBeenCalledWith({
      mode: "split",
      from: "B",
      tablesToNewSection: 2,
      newLabel: "Green",
      fromLabel: "Blue",
    });
  });

  it("labels the section picker with names and carries the picked label into the split", () => {
    const onConfirm = vi.fn();
    render(
      <SectionModal
        open
        sections={[
          { letter: "A", label: "North", tables: 6 },
          { letter: "B", label: "B", tables: 8 },
        ]}
        newSectionLetter="C"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Split existing" }));
    const picker = screen.getByLabelText("Section to split");
    expect(
      screen.getByRole("option", { name: "Section A — North" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Section B" })).toBeInTheDocument();
    fireEvent.change(picker, { target: { value: "B" } });
    expect(screen.getByLabelText("Section B name")).toHaveValue("B");
    fireEvent.change(picker, { target: { value: "A" } });
    expect(screen.getByLabelText("Section A name")).toHaveValue("North");
  });
  it("re-seeds its fields when closed and reopened", () => {
    const props = {
      sections: single,
      newSectionLetter: "B",
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };
    const { rerender } = render(<SectionModal open {...props} />);
    fireEvent.change(screen.getByLabelText("New section (B) name"), {
      target: { value: "Edited" },
    });
    rerender(<SectionModal open={false} {...props} />);
    rerender(<SectionModal open {...props} />);
    expect(screen.getByLabelText("New section (B) name")).toHaveValue("B");
  });
  it("only lists sections with 4+ tables as splittable", () => {
    render(
      <SectionModal
        open
        sections={[
          { letter: "A", label: "A", tables: 6 },
          { letter: "B", label: "B", tables: 3 },
        ]}
        newSectionLetter="C"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("radio", { name: "Split existing" }));

    // Only A (6 tables) can be split; B (3) cannot — a 3-table section can only
    // divide into 2+1, and a 1-table section cannot run. So A is fixed with no
    // picker.
    expect(screen.queryByLabelText("Section to split")).toBeNull();
    expect(screen.getByText(/Splitting/)).toHaveTextContent("Section A");
  });

  it("offers only Add when no section has 4+ tables", () => {
    render(
      <SectionModal
        open
        sections={[
          { letter: "A", label: "A", tables: 3 },
          { letter: "B", label: "B", tables: 2 },
        ]}
        newSectionLetter="C"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // No mode toggle, and the Add field is shown.
    expect(screen.queryByRole("radio", { name: "Split existing" })).toBeNull();
    expect(screen.getByLabelText("New section (C)")).toBeInTheDocument();
  });

  it("disables the confirm button when a required label is blank", () => {
    render(
      <SectionModal
        open
        sections={multi}
        newSectionLetter="C"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(
      <SectionModal
        open
        sections={multi}
        newSectionLetter="C"
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
        sections={multi}
        newSectionLetter="C"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
