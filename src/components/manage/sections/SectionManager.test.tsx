import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionManager } from "./SectionManager";
import { ClientSection } from "@/hooks/sections";

function sections(): ClientSection[] {
  return [
    {
      section: "A",
      label: "Red Room",
      tables: 8,
      ordinal: 0,
      selectedMovement: {
        source: "MITCHELL",
        mitchell: { tables: 8, rounds: 8, boardsPerRound: 3 },
      },
    },
    { section: "B", label: "B", tables: 6, ordinal: 1, selectedMovement: null },
  ];
}

function noopProps() {
  return {
    onAddSection: vi.fn(),
    onRenameSection: vi.fn(),
    onDeleteSection: vi.fn(),
    onSelectMovement: vi.fn(),
  };
}

describe("SectionManager", () => {
  it("lists each section with its movement summary", () => {
    render(<SectionManager sections={sections()} {...noopProps()} />);

    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    expect(
      screen.getByText("Mitchell — 8 tables, 8 rounds"),
    ).toBeInTheDocument();
    expect(screen.getByText("No movement selected")).toBeInTheDocument();
  });

  it("adds a section", () => {
    const props = noopProps();
    render(<SectionManager sections={sections()} {...props} />);

    fireEvent.click(screen.getByText("Add Section"));
    expect(props.onAddSection).toHaveBeenCalledTimes(1);
  });

  it("renames a section on blur when the label changed", () => {
    const props = noopProps();
    render(<SectionManager sections={sections()} {...props} />);

    const labelInputs = screen.getAllByLabelText("Label");
    fireEvent.change(labelInputs[0], { target: { value: "Blue Room" } });
    fireEvent.blur(labelInputs[0]);

    expect(props.onRenameSection).toHaveBeenCalledWith("A", "Blue Room");
  });

  it("does not rename when the label is unchanged", () => {
    const props = noopProps();
    render(<SectionManager sections={sections()} {...props} />);

    const labelInputs = screen.getAllByLabelText("Label");
    fireEvent.blur(labelInputs[0]);

    expect(props.onRenameSection).not.toHaveBeenCalled();
  });

  it("opens the movement picker for a section", () => {
    const props = noopProps();
    render(<SectionManager sections={sections()} {...props} />);

    // Section A has a movement -> "Change Movement"; B has none -> "Set Movement".
    fireEvent.click(screen.getByText("Set Movement"));
    expect(props.onSelectMovement).toHaveBeenCalledWith("B");
  });

  it("deletes a section (only when more than one exists)", () => {
    const props = noopProps();
    render(<SectionManager sections={sections()} {...props} />);

    const deletes = screen.getAllByText("Delete");
    expect(deletes).toHaveLength(2);
    fireEvent.click(deletes[1]);
    expect(props.onDeleteSection).toHaveBeenCalledWith("B");
  });

  it("hides delete when only one section exists", () => {
    const props = noopProps();
    render(
      <SectionManager
        sections={[sections()[0]]}
        {...props}
      />,
    );

    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
  });

  it("hides the section heading and label editor for a single section", () => {
    const props = noopProps();
    render(<SectionManager sections={[sections()[0]]} {...props} />);

    // No "Section X" heading or label editor when there's nothing to distinguish.
    expect(screen.queryByText("Section A")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Label")).not.toBeInTheDocument();

    // Tables and movement controls remain, plus the way to go multi-section.
    expect(screen.getByText("Tables")).toBeInTheDocument();
    expect(screen.getByText("Add Section")).toBeInTheDocument();
  });

  it("shows the section heading and label editor once there are multiple sections", () => {
    const props = noopProps();
    render(<SectionManager sections={sections()} {...props} />);

    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.getByText("Section B")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Label")).toHaveLength(2);
  });

  it("shows the table count as display-only (adjusted from the Tables view)", () => {
    const props = noopProps();
    render(<SectionManager sections={sections()} {...props} />);

    // Section A has 8 tables, B has 6 — shown as static text, no stepper.
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    // NumberStepper renders "−" / "+" buttons; neither should be present.
    expect(screen.queryByText("−")).not.toBeInTheDocument();
    expect(screen.queryByText("+")).not.toBeInTheDocument();
  });

  it("summarises a non-Mitchell selected movement generically", () => {
    const props = noopProps();
    const withSpec: ClientSection[] = [
      {
        section: "A",
        label: "A",
        tables: 8,
        ordinal: 0,
        selectedMovement: {
          source: "SPEC",
          specId: 42,
          boardsPerRound: 3,
        },
      },
      { section: "B", label: "B", tables: 6, ordinal: 1, selectedMovement: null },
    ];
    render(<SectionManager sections={withSpec} {...props} />);

    expect(screen.getByText("Movement selected")).toBeInTheDocument();
  });

  it("is read-only: no add/delete, shows static values", () => {
    const props = noopProps();
    render(<SectionManager sections={sections()} readOnly {...props} />);

    expect(screen.queryByText("Add Section")).not.toBeInTheDocument();
    expect(screen.queryByText("Delete")).not.toBeInTheDocument();
    // Static tables value shown.
    expect(screen.getByText("8")).toBeInTheDocument();
  });
});
