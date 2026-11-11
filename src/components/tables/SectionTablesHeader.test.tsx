import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionTablesHeader } from "./SectionTablesHeader";

function setup(
  props: Partial<React.ComponentProps<typeof SectionTablesHeader>> = {},
) {
  const onResize = vi.fn();
  const onRename = vi.fn();
  const onDelete = vi.fn();
  const utils = render(
    <SectionTablesHeader
      section="A"
      label="A"
      tables={5}
      multiSection
      onResize={onResize}
      onRename={onRename}
      onDelete={onDelete}
      {...props}
    />,
  );
  return { onResize, onRename, onDelete, ...utils };
}

describe("SectionTablesHeader", () => {
  it("shows only the table count and stepper for a single-section game", () => {
    const { onResize } = setup({ multiSection: false });
    expect(screen.getByText("5 tables")).toBeInTheDocument();
    expect(screen.queryByLabelText("Section label")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete section" }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Tables" }), {
      target: { value: "6" },
    });
    expect(onResize).toHaveBeenCalledWith(6);
  });

  it("uses the singular for one table", () => {
    setup({ multiSection: false, tables: 1 });
    expect(screen.getByText("1 table")).toBeInTheDocument();
  });

  it("renames on blur when the label changed (trimmed)", () => {
    const { onRename } = setup({ label: "Red" });
    const input = screen.getByLabelText("Section label");
    fireEvent.change(input, { target: { value: "  Blue  " } });
    fireEvent.blur(input);
    expect(onRename).toHaveBeenCalledWith("Blue");
  });

  it("resets the draft when cleared or unchanged and does not rename", () => {
    const { onRename } = setup({ label: "Red" });
    const input = screen.getByLabelText("Section label");
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);
    expect(input).toHaveValue("Red");
    fireEvent.change(input, { target: { value: "Red" } });
    fireEvent.blur(input);
    expect(onRename).not.toHaveBeenCalled();
  });

  it("deletes the section", () => {
    const { onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Delete section" }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("re-seeds the draft when the selected section or label changes", () => {
    const { rerender, onResize, onRename, onDelete } = setup({ label: "Red" });
    fireEvent.change(screen.getByLabelText("Section label"), {
      target: { value: "Edited" },
    });
    rerender(
      <SectionTablesHeader
        section="B"
        label="Green"
        tables={5}
        multiSection
        onResize={onResize}
        onRename={onRename}
        onDelete={onDelete}
      />,
    );
    expect(screen.getByLabelText("Section label")).toHaveValue("Green");
  });

  it("is read-only once the game has started", () => {
    setup({ readOnly: true, label: "Red" });
    expect(screen.getByText("Red")).toBeInTheDocument();
    expect(screen.queryByLabelText("Section label")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Delete section" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("spinbutton", { name: "Tables" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("5 tables")).toBeInTheDocument();
  });
});
