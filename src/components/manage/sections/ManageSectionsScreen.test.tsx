import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let mockSections = [
  { section: "A", label: "A", tables: 4, ordinal: 0, selectedMovement: null },
  { section: "B", label: "Blue", tables: 6, ordinal: 1, selectedMovement: null },
];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections, isLoading: false }),
}));

const mockCreateSection = vi.fn().mockResolvedValue(undefined);
const mockRenameSection = vi.fn().mockResolvedValue(undefined);
const mockDeleteSection = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/section-service", () => ({
  createSection: (...a: unknown[]) => mockCreateSection(...a),
  renameSection: (...a: unknown[]) => mockRenameSection(...a),
  deleteSection: (...a: unknown[]) => mockDeleteSection(...a),
}));

import { ManageSectionsScreen } from "./ManageSectionsScreen";

describe("ManageSectionsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSections = [
      { section: "A", label: "A", tables: 4, ordinal: 0, selectedMovement: null },
      {
        section: "B",
        label: "Blue",
        tables: 6,
        ordinal: 1,
        selectedMovement: null,
      },
    ];
  });

  it("lists sections without any movement controls", () => {
    render(<ManageSectionsScreen gameId="g1" />);

    expect(screen.getByText("Section A")).toBeInTheDocument();
    expect(screen.queryByText("Set Movement")).toBeNull();
    expect(screen.queryByText("Change Movement")).toBeNull();
  });

  it("renames a section on blur", () => {
    render(<ManageSectionsScreen gameId="g1" />);

    const labels = screen.getAllByLabelText("Label");
    fireEvent.change(labels[0], { target: { value: "North" } });
    fireEvent.blur(labels[0]);

    expect(mockRenameSection).toHaveBeenCalledWith("g1", "A", "North");
  });

  it("deletes a section after confirmation", async () => {
    vi.stubGlobal("confirm", vi.fn(() => true));
    render(<ManageSectionsScreen gameId="g1" />);

    fireEvent.click(screen.getAllByText("Delete")[0]);
    await waitFor(() =>
      expect(mockDeleteSection).toHaveBeenCalledWith("g1", "A"),
    );
  });

  it("adds a section via the modal (one-field for a multi-section game)", async () => {
    render(<ManageSectionsScreen gameId="g1" />);

    fireEvent.click(screen.getByText("Add Section"));
    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "Green" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(mockCreateSection).toHaveBeenCalledWith("g1", "C", 5, "Green"),
    );
  });
});
