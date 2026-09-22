import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let mockSections = [
  { section: "A", label: "A", tables: 4, ordinal: 0, selectedMovement: null },
  {
    section: "B",
    label: "Blue",
    tables: 6,
    ordinal: 1,
    selectedMovement: null,
  },
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

const mockReportError = vi.fn();
vi.mock("@/lib/report-error", () => ({
  reportError: (...a: unknown[]) => mockReportError(...a),
}));

const mockUpdateCombinedRanking = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/game-service", () => ({
  updateCombinedRanking: (...a: unknown[]) => mockUpdateCombinedRanking(...a),
}));

// The screen reads the game (for the combined-ranking toggle) via
// useRequiredGame; supply a minimal game and a mutate spy rather than wrapping
// the tree in a GameProvider.
const mockMutateGame = vi.fn();
let mockGame = { gameId: "g1", combinedRanking: true };
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: mockGame, mutateGame: mockMutateGame }),
}));

import { ManageSectionsScreen } from "./ManageSectionsScreen";

describe("ManageSectionsScreen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSections = [
      {
        section: "A",
        label: "A",
        tables: 4,
        ordinal: 0,
        selectedMovement: null,
      },
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
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
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

  it("closes the add-section modal on cancel without creating", () => {
    render(<ManageSectionsScreen gameId="g1" />);

    fireEvent.click(screen.getByText("Add Section"));
    expect(screen.getByLabelText("New section (C)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockCreateSection).not.toHaveBeenCalled();
  });

  it("names both sections on the first add (1 -> 2), renaming the existing one", async () => {
    // A single-section game: the modal is two-field, naming the existing
    // section (A) and the new one (B).
    mockSections = [
      {
        section: "A",
        label: "A",
        tables: 4,
        ordinal: 0,
        selectedMovement: null,
      },
    ];
    render(<ManageSectionsScreen gameId="g1" />);

    fireEvent.click(screen.getByText("Add Section"));
    fireEvent.change(screen.getByLabelText("Existing section (A)"), {
      target: { value: "North" },
    });
    fireEvent.change(screen.getByLabelText("New section (B)"), {
      target: { value: "South" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(mockRenameSection).toHaveBeenCalledWith("g1", "A", "North"),
    );
    expect(mockCreateSection).toHaveBeenCalledWith("g1", "B", 5, "South");
  });

  it("reports an error when adding a section fails", async () => {
    mockCreateSection.mockRejectedValueOnce(new Error("nope"));
    render(<ManageSectionsScreen gameId="g1" />);

    fireEvent.click(screen.getByText("Add Section"));
    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "Green" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(mockReportError).toHaveBeenCalled());
  });

  it("reports an error when a rename fails", async () => {
    mockRenameSection.mockRejectedValueOnce(new Error("bad"));
    render(<ManageSectionsScreen gameId="g1" />);

    const labels = screen.getAllByLabelText("Label");
    fireEvent.change(labels[0], { target: { value: "North" } });
    fireEvent.blur(labels[0]);

    await waitFor(() => expect(mockReportError).toHaveBeenCalled());
  });

  it("does not delete when the confirm is cancelled", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    render(<ManageSectionsScreen gameId="g1" />);

    fireEvent.click(screen.getAllByText("Delete")[0]);
    expect(mockDeleteSection).not.toHaveBeenCalled();
  });

  it("reports an error when a delete fails", async () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => true),
    );
    mockDeleteSection.mockRejectedValueOnce(new Error("boom"));
    render(<ManageSectionsScreen gameId="g1" />);

    fireEvent.click(screen.getAllByText("Delete")[0]);
    await waitFor(() => expect(mockReportError).toHaveBeenCalled());
  });
});
