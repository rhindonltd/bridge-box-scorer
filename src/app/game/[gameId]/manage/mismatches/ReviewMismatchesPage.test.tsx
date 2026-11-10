import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

let sectionsState: {
  sections: { section: string }[];
  isLoading: boolean;
};
vi.mock("@/hooks/sections", () => ({
  useSections: () => sectionsState,
}));

const mockFetch = vi.fn();
vi.mock("@/lib/mismatch-service", () => ({
  fetchMismatchCandidates: (...a: unknown[]) => mockFetch(...a),
}));

const mockEmit = vi.fn();
vi.mock("@/lib/socket", () => ({
  emitWithAck: (...a: unknown[]) => mockEmit(...a),
}));
vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "dir-tok",
}));

import { ReviewMismatchesPage } from "./ReviewMismatchesPage";

const pairCandidate = {
  section: "A",
  participantKind: "PAIR",
  roundNumber: 3,
  mismatchedId: 5,
  actualOpponent: 6,
  correctOpponent: 7,
  actualOpponentVp: 20,
  correctOpponentVp: 30,
  direction: "HIGHER",
  tableNumber: 2,
  side: "NS",
  boardNumber: 9,
};
const teamCandidate = {
  ...pairCandidate,
  section: "B",
  participantKind: "TEAM",
  direction: "LOWER",
  mismatchedId: 8,
  boardNumber: 10,
};

describe("ReviewMismatchesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sectionsState = { sections: [{ section: "A" }], isLoading: false };
    mockFetch.mockResolvedValue([pairCandidate]);
    mockEmit.mockResolvedValue(undefined);
  });

  it("shows a spinner while sections load and does not fetch", () => {
    sectionsState = { sections: [], isLoading: true };
    const { container } = render(<ReviewMismatchesPage gameId="g1" />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("does not fetch when there are no sections", () => {
    sectionsState = { sections: [], isLoading: false };
    render(<ReviewMismatchesPage gameId="g1" />);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows the empty state when there are no candidates", async () => {
    mockFetch.mockResolvedValue([]);
    render(<ReviewMismatchesPage gameId="g1" />);
    expect(await screen.findByText(/No mismatches to review/)).toBeInTheDocument();
  });

  it("renders pair and team candidates across sections", async () => {
    sectionsState = {
      sections: [{ section: "A" }, { section: "B" }],
      isLoading: false,
    };
    mockFetch.mockImplementation(async (_g: string, s: string) =>
      s === "A" ? [pairCandidate] : [teamCandidate],
    );
    render(<ReviewMismatchesPage gameId="g1" />);
    expect(await screen.findByText(/Pair 5 played pair 6/)).toBeInTheDocument();
    expect(screen.getByText(/a stronger/)).toBeInTheDocument();
    expect(screen.getByText(/Team 8 played team 6/)).toBeInTheDocument();
    expect(screen.getByText(/a weaker/)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledWith("g1", "A");
    expect(mockFetch).toHaveBeenCalledWith("g1", "B");
  });

  it("applies a ruling and removes the card", async () => {
    render(<ReviewMismatchesPage gameId="g1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Apply — their own fault" }),
    );
    await waitFor(() =>
      expect(screen.getByText(/No mismatches to review/)).toBeInTheDocument(),
    );
    expect(mockEmit).toHaveBeenCalledWith(
      "traveller:markMismatch",
      expect.objectContaining({
        gameId: "g1",
        directorToken: "dir-tok",
        boardNumber: 9,
        roundNumber: 3,
        tableNumber: 2,
        side: "NS",
        direction: "HIGHER",
        fault: "OWN",
      }),
    );
  });

  it("applies a not-their-fault ruling", async () => {
    render(<ReviewMismatchesPage gameId="g1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Apply — not their fault" }),
    );
    await waitFor(() =>
      expect(mockEmit).toHaveBeenCalledWith(
        "traveller:markMismatch",
        expect.objectContaining({ fault: "NOT" }),
      ),
    );
  });

  it("shows the error and keeps the card when apply fails", async () => {
    mockEmit.mockRejectedValue(new Error("boom"));
    render(<ReviewMismatchesPage gameId="g1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Apply — not their fault" }),
    );
    expect(await screen.findByText("boom")).toBeInTheDocument();
    expect(screen.getByText(/Pair 5 played/)).toBeInTheDocument();
  });

  it("uses a generic message when apply rejects with a non-Error", async () => {
    mockEmit.mockRejectedValue("nope");
    render(<ReviewMismatchesPage gameId="g1" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Apply — not their fault" }),
    );
    expect(await screen.findByText("Failed to apply ruling")).toBeInTheDocument();
  });

  it("dismisses a candidate without emitting", async () => {
    render(<ReviewMismatchesPage gameId="g1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Not a mismatch" }));
    expect(screen.getByText(/No mismatches to review/)).toBeInTheDocument();
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it("shows the fetch error message", async () => {
    mockFetch.mockRejectedValue(new Error("load failed"));
    render(<ReviewMismatchesPage gameId="g1" />);
    expect(await screen.findByText("load failed")).toBeInTheDocument();
  });

  it("uses a generic message when the fetch rejects with a non-Error", async () => {
    mockFetch.mockRejectedValue("x");
    render(<ReviewMismatchesPage gameId="g1" />);
    expect(
      await screen.findByText("Failed to load mismatches"),
    ).toBeInTheDocument();
  });

  it("ignores a fetch result that resolves after unmount", async () => {
    let resolve!: (v: unknown[]) => void;
    mockFetch.mockReturnValue(new Promise((r) => (resolve = r)));
    const { unmount } = render(<ReviewMismatchesPage gameId="g1" />);
    unmount();
    resolve([pairCandidate]);
    await Promise.resolve();
  });

  it("ignores a fetch failure that rejects after unmount", async () => {
    let reject!: (e: unknown) => void;
    mockFetch.mockReturnValue(new Promise((_, r) => (reject = r)));
    const { unmount } = render(<ReviewMismatchesPage gameId="g1" />);
    unmount();
    reject(new Error("late"));
    await Promise.resolve();
  });
});
