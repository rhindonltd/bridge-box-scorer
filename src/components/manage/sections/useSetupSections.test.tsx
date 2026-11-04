import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let mockSections: { section: string; label: string; tables: number }[] = [];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections, isLoading: false }),
}));

const mockCreateSection = vi.fn().mockResolvedValue(undefined);
const mockRenameSection = vi.fn().mockResolvedValue(undefined);
const mockSplitSection = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/section-service", () => ({
  createSection: (...args: unknown[]) => mockCreateSection(...args),
  renameSection: (...args: unknown[]) => mockRenameSection(...args),
  splitSection: (...args: unknown[]) => mockSplitSection(...args),
}));

const mockReportError = vi.fn();
vi.mock("@/lib/report-error", () => ({
  reportError: (...a: unknown[]) => mockReportError(...a),
}));

import { useSetupSections } from "./useSetupSections";

function Harness() {
  const { selected, pills, modal } = useSetupSections("g1");
  return (
    <div>
      <div data-testid="selected">{selected}</div>
      {pills}
      {modal}
    </div>
  );
}

function openModal() {
  fireEvent.click(
    screen.getByRole("button", { name: /Split into sections|Add section/ }),
  );
}

describe("useSetupSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSections = [{ section: "A", label: "A", tables: 4 }];
  });

  it("splits the single section by default (first open), moving tables + renaming", async () => {
    render(<Harness />);
    openModal();

    // A single-section game opens in Split mode. A 4-table section splits 2/2
    // (the minimum each side, which is also the default). Name both sides.
    fireEvent.change(screen.getByLabelText("Section A name"), {
      target: { value: "North" },
    });
    fireEvent.change(screen.getByLabelText("New section (B) name"), {
      target: { value: "South" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Split" }));

    await waitFor(() =>
      expect(mockSplitSection).toHaveBeenCalledWith("g1", {
        from: "A",
        newSection: "B",
        tablesToNewSection: 2,
        newLabel: "South",
        fromLabel: "North",
      }),
    );
    expect(mockCreateSection).not.toHaveBeenCalled();
  });

  it("adds a brand-new section (first add) when the director picks Add new", async () => {
    render(<Harness />);
    openModal();

    // Switch from the default Split to Add; the first add also renames A.
    fireEvent.click(screen.getByRole("radio", { name: "Add new" }));
    fireEvent.change(screen.getByLabelText("Existing section (A)"), {
      target: { value: "North" },
    });
    fireEvent.change(screen.getByLabelText("New section (B)"), {
      target: { value: "South" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(mockCreateSection).toHaveBeenCalledWith("g1", "B", 5, "South"),
    );
    expect(mockRenameSection).toHaveBeenCalledWith("g1", "A", "North");
    expect(mockSplitSection).not.toHaveBeenCalled();
  });

  it("subsequent add defaults to Add and only creates (one-field)", async () => {
    mockSections = [
      { section: "A", label: "A", tables: 4 },
      { section: "B", label: "B", tables: 4 },
    ];
    render(<Harness />);
    openModal();

    expect(screen.queryByLabelText(/Existing section/)).toBeNull();
    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "Green" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(mockCreateSection).toHaveBeenCalledWith("g1", "C", 5, "Green"),
    );
    expect(mockRenameSection).not.toHaveBeenCalled();
    expect(mockSplitSection).not.toHaveBeenCalled();
  });

  it("splits a chosen existing section in a multi-section game", async () => {
    mockSections = [
      { section: "A", label: "A", tables: 6 },
      { section: "B", label: "B", tables: 2 },
    ];
    render(<Harness />);
    openModal();

    fireEvent.click(screen.getByRole("radio", { name: "Split existing" }));

    // Only A (6 tables) is splittable — B (2) is too small — so A is fixed with
    // no picker. Move 2 of A's tables into the new section C.
    fireEvent.change(screen.getByLabelText("Tables in new section"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Section A name"), {
      target: { value: "Top" },
    });
    fireEvent.change(screen.getByLabelText("New section (C) name"), {
      target: { value: "Spill" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Split" }));

    await waitFor(() =>
      expect(mockSplitSection).toHaveBeenCalledWith("g1", {
        from: "A",
        newSection: "C",
        tablesToNewSection: 2,
        newLabel: "Spill",
        fromLabel: "Top",
      }),
    );
  });

  it("keeps the current selection across an add", async () => {
    mockSections = [
      { section: "A", label: "A", tables: 4 },
      { section: "B", label: "B", tables: 4 },
    ];
    render(<Harness />);

    fireEvent.click(screen.getByRole("tab", { name: /Section B/ }));
    expect(screen.getByTestId("selected")).toHaveTextContent("B");

    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(mockCreateSection).toHaveBeenCalled());
    expect(screen.getByTestId("selected")).toHaveTextContent("B");
  });

  it("reports an error when the add fails", async () => {
    mockSections = [
      { section: "A", label: "A", tables: 4 },
      { section: "B", label: "B", tables: 4 },
    ];
    mockCreateSection.mockRejectedValueOnce(new Error("nope"));
    render(<Harness />);

    openModal();
    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "Green" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(mockReportError).toHaveBeenCalled());
  });

  it("reports an error when the split fails", async () => {
    mockSplitSection.mockRejectedValueOnce(new Error("boom"));
    render(<Harness />);

    openModal();
    fireEvent.change(screen.getByLabelText("Section A name"), {
      target: { value: "North" },
    });
    fireEvent.change(screen.getByLabelText("New section (B) name"), {
      target: { value: "South" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Split" }));

    await waitFor(() => expect(mockReportError).toHaveBeenCalled());
  });

  it("falls back to an empty selection when there are no sections yet", () => {
    mockSections = [];
    render(<Harness />);
    // `selected ?? ""` resolves to "" so the pills get an empty selection.
    expect(screen.getByTestId("selected")).toHaveTextContent("");
  });

  it("closes the modal on cancel without creating or splitting", () => {
    render(<Harness />);

    openModal();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockCreateSection).not.toHaveBeenCalled();
    expect(mockSplitSection).not.toHaveBeenCalled();
  });
});
