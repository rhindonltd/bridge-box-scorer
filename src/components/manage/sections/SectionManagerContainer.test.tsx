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
}));

// Stub the presentational children so we can drive their callbacks directly
// and assert the container's wiring without their full subtrees.
vi.mock("./SectionManager", () => ({
  SectionManager: (props: {
    sections: { section: string }[];
    readOnly: boolean;
    onAddSection: () => void;
    onRenameSection: (s: string, l: string) => void;
    onDeleteSection: (s: string) => void;
    onSelectMovement: (s: string) => void;
  }) => (
    <div>
      <span data-testid="section-count">{props.sections.length}</span>
      <span data-testid="read-only">{String(props.readOnly)}</span>
      <button onClick={() => props.onAddSection()}>add</button>
      <button onClick={() => props.onRenameSection("A", "North")}>rename</button>
      <button onClick={() => props.onDeleteSection("A")}>delete</button>
      <button onClick={() => props.onSelectMovement("A")}>pick</button>
    </div>
  ),
}));

vi.mock("./SectionMovementPicker", () => ({
  SectionMovementPicker: (props: {
    section: string;
    multiSection?: boolean;
    onDone?: () => void;
    onAddSection?: () => void;
  }) => (
    <div>
      <span data-testid="picker-section">{props.section}</span>
      <span data-testid="picker-multi">{String(props.multiSection)}</span>
      <span data-testid="picker-has-done">{String(!!props.onDone)}</span>
      {props.onDone && <button onClick={props.onDone}>done</button>}
      {props.onAddSection && (
        <button onClick={props.onAddSection}>picker-add</button>
      )}
    </div>
  ),
}));

import {
  createSection,
  renameSection,
  deleteSection,
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
    // A and B exist -> next letter is C, defaulting to 5 tables.
    await waitFor(() =>
      expect(createSection).toHaveBeenCalledWith("g1", "C", 5),
    );
  });

  it("wires rename through the section service", async () => {
    render(<SectionManagerContainer gameId="g1" />);

    fireEvent.click(screen.getByRole("button", { name: "rename" }));
    await waitFor(() =>
      expect(renameSection).toHaveBeenCalledWith("g1", "A", "North"),
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

  it("falls back to a numbered suffix when all 26 letters are used", async () => {
    const all = Array.from({ length: 26 }, (_, i) => ({
      section: String.fromCharCode(65 + i),
      label: String.fromCharCode(65 + i),
      tables: 5,
      ordinal: i,
      selectedMovement: null,
    }));
    mockUseSections.mockReturnValue({ sections: all, isLoading: false });

    render(<SectionManagerContainer gameId="g1" readOnly />);
    fireEvent.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() =>
      expect(createSection).toHaveBeenCalledWith("g1", "Z26", 5),
    );
  });

  it("reports rename errors via alert", async () => {
    vi.mocked(renameSection).mockRejectedValueOnce(new Error("rename boom"));
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);

    render(<SectionManagerContainer gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "rename" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("rename boom"));
  });

  it("reports delete errors via alert", async () => {
    vi.mocked(deleteSection).mockRejectedValueOnce(new Error("delete boom"));
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);

    render(<SectionManagerContainer gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "delete" }));

    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith("delete boom"));
  });

  it("uses a generic message when a non-Error is thrown", async () => {
    vi.mocked(createSection).mockRejectedValueOnce("not an error object");
    const alertSpy = vi.fn();
    vi.stubGlobal("alert", alertSpy);

    render(<SectionManagerContainer gameId="g1" />);
    fireEvent.click(screen.getByRole("button", { name: "add" }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith("Something went wrong"),
    );
  });

  describe("single section", () => {
    const single = [
      { section: "A", label: "A", tables: 5, ordinal: 0, selectedMovement: null },
    ];

    beforeEach(() => {
      mockUseSections.mockReturnValue({ sections: single, isLoading: false });
    });

    it("skips the list and shows the movement picker directly", () => {
      render(<SectionManagerContainer gameId="g1" />);

      expect(screen.getByTestId("picker-section").textContent).toBe("A");
      // No section distinction, and it is the root view (no back control).
      expect(screen.getByTestId("picker-multi").textContent).toBe("false");
      expect(screen.getByTestId("picker-has-done").textContent).toBe("false");
      // The list is not rendered.
      expect(screen.queryByTestId("section-count")).not.toBeInTheDocument();
    });

    it("adds section B (default 5 tables) from the picker's Add Section", async () => {
      render(<SectionManagerContainer gameId="g1" />);

      fireEvent.click(screen.getByRole("button", { name: "picker-add" }));
      // Only A exists -> next letter is B, defaulting to 5 tables.
      await waitFor(() =>
        expect(createSection).toHaveBeenCalledWith("g1", "B", 5),
      );
    });

    it("shows the list (not the picker) when read-only", () => {
      render(<SectionManagerContainer gameId="g1" readOnly />);

      expect(screen.getByTestId("section-count").textContent).toBe("1");
      expect(screen.queryByTestId("picker-section")).not.toBeInTheDocument();
    });
  });
});
