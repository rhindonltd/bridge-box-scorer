import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let mockSections: { section: string; label: string; tables: number }[] = [];
vi.mock("@/hooks/sections", () => ({
  useSections: () => ({ sections: mockSections, isLoading: false }),
}));

const mockCreateSection = vi.fn().mockResolvedValue(undefined);
const mockRenameSection = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/section-service", () => ({
  createSection: (...args: unknown[]) => mockCreateSection(...args),
  renameSection: (...args: unknown[]) => mockRenameSection(...args),
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

describe("useSetupSections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSections = [{ section: "A", label: "A", tables: 4 }];
  });

  it("first add opens a two-field modal and renames existing + creates new", async () => {
    render(<Harness />);

    fireEvent.click(
      screen.getByRole("button", { name: /Split into sections|Add section/ }),
    );

    // Two-field modal (rename A + name B).
    const existing = screen.getByLabelText("Existing section (A)");
    const added = screen.getByLabelText("New section (B)");
    fireEvent.change(existing, { target: { value: "North" } });
    fireEvent.change(added, { target: { value: "South" } });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(mockCreateSection).toHaveBeenCalledWith("g1", "B", 5, "South"),
    );
    expect(mockRenameSection).toHaveBeenCalledWith("g1", "A", "North");
  });

  it("subsequent add opens a one-field modal and only creates", async () => {
    mockSections = [
      { section: "A", label: "A", tables: 4 },
      { section: "B", label: "B", tables: 4 },
    ];
    render(<Harness />);

    fireEvent.click(
      screen.getByRole("button", { name: /Split into sections|Add section/ }),
    );

    expect(screen.queryByLabelText(/Existing section/)).toBeNull();
    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "Green" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(mockCreateSection).toHaveBeenCalledWith("g1", "C", 5, "Green"),
    );
    expect(mockRenameSection).not.toHaveBeenCalled();
  });

  it("keeps the current selection across an add", async () => {
    mockSections = [
      { section: "A", label: "A", tables: 4 },
      { section: "B", label: "B", tables: 4 },
    ];
    render(<Harness />);

    fireEvent.click(screen.getByRole("tab", { name: /Section B/ }));
    expect(screen.getByTestId("selected")).toHaveTextContent("B");

    fireEvent.click(
      screen.getByRole("button", { name: /Split into sections|Add section/ }),
    );
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

    fireEvent.click(
      screen.getByRole("button", { name: /Split into sections|Add section/ }),
    );
    fireEvent.change(screen.getByLabelText("New section (C)"), {
      target: { value: "Green" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() => expect(mockReportError).toHaveBeenCalled());
  });

  it("falls back to an empty selection when there are no sections yet", () => {
    mockSections = [];
    render(<Harness />);
    // `selected ?? ""` resolves to "" so the pills get an empty selection.
    expect(screen.getByTestId("selected")).toHaveTextContent("");
  });

  it("closes the modal on cancel without creating", () => {
    render(<Harness />);

    fireEvent.click(
      screen.getByRole("button", { name: /Split into sections|Add section/ }),
    );
    expect(screen.getByLabelText("New section (B)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockCreateSection).not.toHaveBeenCalled();
  });
});
