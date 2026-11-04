import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    actions,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

import { ExportReadinessPage } from "./ExportReadinessPage";
import type { ReadinessItem } from "./ExportReadinessPage";

const readyItems: ReadinessItem[] = [
  {
    id: "results",
    title: "Results entered",
    detail: "All 24 boards have a result.",
    level: "ready",
  },
  {
    id: "club",
    title: "Club information",
    detail: "Club name and EBU number are set.",
    level: "ready",
  },
];

describe("ExportReadinessPage", () => {
  const onBack = vi.fn();
  const onContinue = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders each item's title and detail", () => {
    render(
      <ExportReadinessPage
        onBack={onBack}
        onContinue={onContinue}
        items={readyItems}
      />,
    );
    expect(screen.getByText("Results entered")).toBeInTheDocument();
    expect(screen.getByText("All 24 boards have a result.")).toBeInTheDocument();
    expect(screen.getByText("Club information")).toBeInTheDocument();
  });

  it("wires the back and continue actions", () => {
    render(
      <ExportReadinessPage
        onBack={onBack}
        onContinue={onContinue}
        items={readyItems}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", { name: "Continue to Export Options" }),
    );
    expect(onContinue).toHaveBeenCalled();
  });

  it("shows the all-ready summary when nothing is outstanding", () => {
    render(
      <ExportReadinessPage
        onBack={onBack}
        onContinue={onContinue}
        items={readyItems}
      />,
    );
    expect(screen.getByText("Everything is ready to export.")).toBeInTheDocument();
  });

  it("shows a warning summary when a result item is a warning", () => {
    render(
      <ExportReadinessPage
        onBack={onBack}
        onContinue={onContinue}
        items={[
          {
            id: "results",
            title: "Results entered",
            detail: "3 of 24 boards still need a result.",
            level: "warning",
          },
        ]}
      />,
    );
    expect(
      screen.getByText(/some results are still outstanding/i),
    ).toBeInTheDocument();
  });

  it("shows a blocker summary when any item is a blocker", () => {
    render(
      <ExportReadinessPage
        onBack={onBack}
        onContinue={onContinue}
        items={[
          {
            id: "club",
            title: "Club information",
            detail: "Set the club name and EBU number in Settings.",
            level: "blocker",
          },
        ]}
      />,
    );
    expect(
      screen.getByText(/can't be generated yet/i),
    ).toBeInTheDocument();
  });

  describe("outstanding-board breakdown", () => {
    const warningWithBoards: ReadinessItem[] = [
      {
        id: "results",
        title: "Results entered",
        detail: "2 of 24 results are outstanding.",
        level: "warning",
        boards: [
          {
            id: "A-2-7",
            title: "Round 3 · Table 2 · Board 7",
            players: "Alice & Bob vs Carol & Dan",
          },
          {
            id: "A-3-7",
            title: "Round 3 · Table 3 · Board 7",
            players: "Eve & Frank vs Grace & Heidi",
          },
        ],
      },
    ];

    it("hides the breakdown until the item is tapped", () => {
      render(
        <ExportReadinessPage
          onBack={onBack}
          onContinue={onContinue}
          items={warningWithBoards}
        />,
      );
      // Collapsed initially: the boards are not shown, but the hint is.
      expect(
        screen.queryByText("Round 3 · Table 2 · Board 7"),
      ).not.toBeInTheDocument();
      expect(screen.getByText("Tap to see which")).toBeInTheDocument();

      const toggle = screen.getByRole("button", { name: /Results entered/ });
      expect(toggle).toHaveAttribute("aria-expanded", "false");

      fireEvent.click(toggle);

      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(
        screen.getByText("Round 3 · Table 2 · Board 7"),
      ).toBeInTheDocument();
      expect(screen.getByText("Alice & Bob vs Carol & Dan")).toBeInTheDocument();
      expect(
        screen.getByText("Round 3 · Table 3 · Board 7"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Tap to see which")).not.toBeInTheDocument();
    });

    it("collapses again when tapped a second time", () => {
      render(
        <ExportReadinessPage
          onBack={onBack}
          onContinue={onContinue}
          items={warningWithBoards}
        />,
      );
      const toggle = screen.getByRole("button", { name: /Results entered/ });
      fireEvent.click(toggle);
      expect(
        screen.getByText("Round 3 · Table 2 · Board 7"),
      ).toBeInTheDocument();

      fireEvent.click(toggle);
      expect(
        screen.queryByText("Round 3 · Table 2 · Board 7"),
      ).not.toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-expanded", "false");
    });

    it("renders an item without a breakdown as a plain, non-interactive row", () => {
      render(
        <ExportReadinessPage
          onBack={onBack}
          onContinue={onContinue}
          items={[
            {
              id: "results",
              title: "Results entered",
              detail: "3 of 24 boards still need a result.",
              level: "warning",
            },
          ]}
        />,
      );
      // No toggle button for the item, and no hint.
      expect(
        screen.queryByRole("button", { name: /Results entered/ }),
      ).not.toBeInTheDocument();
      expect(screen.queryByText("Tap to see which")).not.toBeInTheDocument();
    });
  });

  it("keeps Continue enabled even with a blocker (the page is informative only)", () => {
    render(
      <ExportReadinessPage
        onBack={onBack}
        onContinue={onContinue}
        items={[
          {
            id: "club",
            title: "Club information",
            detail: "Set the club name and EBU number in Settings.",
            level: "blocker",
          },
        ]}
      />,
    );
    const button = screen.getByRole("button", {
      name: "Continue to Export Options",
    });
    expect(button).toBeEnabled();
  });
});
