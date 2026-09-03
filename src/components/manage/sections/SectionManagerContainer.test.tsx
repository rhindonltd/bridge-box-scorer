import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockUseSections = vi.fn();
vi.mock("@/hooks/sections", () => ({
  useSections: (...args: unknown[]) => mockUseSections(...args),
}));

vi.mock("@/lib/section-service", () => ({
  createSection: vi.fn(),
  renameSection: vi.fn(),
  deleteSection: vi.fn(),
  updateSectionTables: vi.fn(),
}));

// Stub the presentational children so we can drive their callbacks directly
// and assert the container's wiring without their full subtrees.
vi.mock("./SectionManager", () => ({
  SectionManager: (props: {
    sections: { section: string }[];
    readOnly: boolean;
    onAddSection: () => void;
    onRenameSection: (s: string, l: string) => void;
    onResizeSection: (s: string, t: number) => void;
    onDeleteSection: (s: string) => void;
    onSelectMovement: (s: string) => void;
  }) => (
    <div>
      <span data-testid="section-count">{props.sections.length}</span>
      <span data-testid="read-only">{String(props.readOnly)}</span>
      <button onClick={() => props.onAddSection()}>add</button>
      <button onClick={() => props.onRenameSection("A", "North")}>rename</button>
      <button onClick={() => props.onResizeSection("A", 9)}>resize</button>
      <button onClick={() => props.onDeleteSection("A")}>delete</button>
      <button onClick={() => props.onSelectMovement("A")}>pick</button>
    </div>
  ),
}));

vi.mock("./SectionMovementPicker", () => ({
  SectionMovementPicker: (props: { section: string; onDone: () => void }) => (
    <div>
      <span data-testid="picker-section">{props.section}</span>
      <button onClick={props.onDone}>done</button>
    </div>
  ),
}));

import {
  createSection,
  renameSection,
  deleteSection,
  updateSectionTables,
} from "@/lib/section-service";
import { SectionManagerContainer } from "./SectionManagerContainer";

const sections = [
  { section: "A", label: "A", tables: 8, ordinal: 0, selectedMovement: null },
  { section: "B", label: "B", tables: 6, ordinal: 1, selectedMovement: null },
];

describe("SectionManagerContainer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSections.mockReturnValue({ sections, isLoading: false });
    vi.stubGlobal("confirm", vi.fn(() => true));
    vi.stubGlobal("alert", vi.fn());
  });

  it("renders the SectionManager with the live sections", () => {
    render(<SectionManagerContainer gameId="g1" />);
    expect(screen.getByTestId("section-count").textContent).toBe("2");
    expect(screen.getByTestId("read-only").textContent).toBe("false");
  });

  it("adds a section using the next unused letter", async () => {
    render(<SectionManagerContainer gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "add" }));
    // A and B exist -> next letter is C, with 1 table.
    await waitFor(() =>
      expect(createSection).toHaveBeenCalledWith("g1", "C", 1),
    );
  });

  it("wires rename and resize through the section service", async () => {
    render(<SectionManagerContainer gameId="g1" />);

    fireEvent.click(screen.getByRole("button", { name: "rename" }));
    await waitFor(() =>
      expect(renameSection).toHaveBeenCalledWith("g1", "A", "North"),
    );

    fireEvent.click(screen.getByRole("button", { name: "resize" }));
    await waitFor(() =>
      expect(updateSectionTables).toHaveBeenCalledWith("g1", "A", 9),
    );
  });

  it("confirms before deleting a section", async () => {
    render(<SectionManagerContainer gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    await waitFor(() =>
      expect(deleteSection).toHaveBeenCalledWith("g1", "A"),
    );
  });

  it("does not delete when the confirm is cancelled", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<SectionManagerContainer gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "delete" }));
    expect(deleteSection).not.toHaveBeenCalled();
  });

  it("switches to the movement picker for the chosen section and back", () => {
    render(<SectionManagerContainer gameId="g1" />);

    fireEvent.click(screen.getByRole("button", { name: "pick" }));
    expect(screen.getByTestId("picker-section").textContent).toBe("A");

    // onDone returns to the manager view.
    fireEvent.click(screen.getByRole("button", { name: "done" }));
    expect(screen.getByTestId("section-count")).toBeInTheDocument();
  });

  it("reports service errors via alert", async () => {
    vi.mocked(createSection).mockRejectedValueOnce(new Error("dup letter"));
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);

    render(<SectionManagerContainer gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("dup letter"));
  });

  it("passes readOnly through", () => {
    render(<SectionManagerContainer gameId="g1" readOnly />);
    expect(screen.getByTestId("read-only").textContent).toBe("true");
  });
});
