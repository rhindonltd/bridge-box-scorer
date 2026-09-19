import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { RecommendedMovement } from "@/movement/recommendations/recommendation-types";

// SWR is driven per-test so the db-detail fetch can supply (or withhold) layout.
const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

// The Mitchell generator is mocked so a test can force it to throw, exercising
// the preview's defensive catch -> null (spinner) path.
const mockGenerateMitchell = vi.fn();
vi.mock("@/movement/mitchell/mitchell", () => ({
  generateMitchell: (...a: unknown[]) => mockGenerateMitchell(...a),
}));

const mockGeneratedToMovementByTable = vi.fn();
vi.mock("@/movement/movementData", () => ({
  generatedToMovementByTable: (...a: unknown[]) =>
    mockGeneratedToMovementByTable(...a),
}));

// The detail view is presentational; stub it so we only assert it mounts.
vi.mock("@/components/movement/MovementDetailView", () => ({
  MovementDetailView: () => <div data-testid="detail-view" />,
}));

import { MovementPreviewDialog } from "./MovementPreviewDialog";

function generatedRec(): RecommendedMovement {
  return {
    family: "MITCHELL",
    name: "Mitchell",
    rounds: 8,
    boardsPerRound: 2,
    boardsPerPair: 16,
    boardsInPlay: 16,
    copies: 1,
    pros: [],
    cons: [],
    source: "generated",
    specRef: {
      source: "generated",
      spec: { tables: 8, rounds: 8, boardsPerRound: 2 },
    },
  } as never;
}

function dbRec(): RecommendedMovement {
  return {
    family: "HOWELL",
    name: "Howell",
    rounds: 6,
    boardsPerRound: 4,
    boardsPerPair: 24,
    boardsInPlay: 24,
    copies: 1,
    pros: [],
    cons: [],
    source: "db",
    specRef: { source: "db", id: 42, type: "2" },
  } as never;
}

describe("MovementPreviewDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSWR.mockReturnValue({ data: undefined });
    mockGenerateMitchell.mockReturnValue({});
    mockGeneratedToMovementByTable.mockReturnValue([{ tableNumber: 1 }]);
  });

  it("renders nothing when no movement is provided", () => {
    render(
      <MovementPreviewDialog
        movement={null}
        saving={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows the generated preview and confirms the movement", () => {
    const onConfirm = vi.fn();
    const movement = generatedRec();
    render(
      <MovementPreviewDialog
        movement={movement}
        saving={false}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText("Mitchell")).toBeInTheDocument();
    expect(screen.getByTestId("detail-view")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /select movement/i }));
    expect(onConfirm).toHaveBeenCalledWith(movement);
  });

  it("falls back to the spinner when the Mitchell generator throws", () => {
    mockGenerateMitchell.mockImplementation(() => {
      throw new Error("bad spec");
    });
    render(
      <MovementPreviewDialog
        movement={generatedRec()}
        saving={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // No detail view; the Select Movement button is disabled (no previewTables).
    expect(screen.queryByTestId("detail-view")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select movement/i }),
    ).toBeDisabled();
  });

  it("fetches and shows a db movement's layout", () => {
    mockUseSWR.mockReturnValue({
      data: { type: "PAIRS", tables: [{ tableNumber: 1 }] },
    });
    render(
      <MovementPreviewDialog
        movement={dbRec()}
        saving={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByTestId("detail-view")).toBeInTheDocument();
    // The generator is not used for db movements.
    expect(mockGenerateMitchell).not.toHaveBeenCalled();
  });

  it("shows the spinner for a db movement whose layout hasn't loaded", () => {
    mockUseSWR.mockReturnValue({ data: undefined });
    render(
      <MovementPreviewDialog
        movement={dbRec()}
        saving={false}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.queryByTestId("detail-view")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /select movement/i }),
    ).toBeDisabled();
  });

  it("closes on the Close button", () => {
    const onClose = vi.fn();
    render(
      <MovementPreviewDialog
        movement={generatedRec()}
        saving={false}
        onClose={onClose}
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^close$/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows a saving state and disables the actions", () => {
    render(
      <MovementPreviewDialog
        movement={generatedRec()}
        saving={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /selecting…/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /^close$/i })).toBeDisabled();
  });
});
