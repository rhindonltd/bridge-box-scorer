import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { StepAdjustmentType } from "./StepAdjustmentType";

describe("StepAdjustmentType", () => {
  function renderHub() {
    const onEnterContract = vi.fn();
    const onAdjustedScore = vi.fn();
    const onWeightedScore = vi.fn();
    const onCancelBoard = vi.fn();
    render(
      <StepAdjustmentType
        onEnterContract={onEnterContract}
        onAdjustedScore={onAdjustedScore}
        onWeightedScore={onWeightedScore}
        onCancelBoard={onCancelBoard}
      />,
    );
    return { onEnterContract, onAdjustedScore, onWeightedScore, onCancelBoard };
  }

  it("routes to each of the four core adjustment types", () => {
    const h = renderHub();

    fireEvent.click(screen.getByRole("button", { name: "Enter Contract" }));
    expect(h.onEnterContract).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Adjusted Score" }));
    expect(h.onAdjustedScore).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Weighted Score" }));
    expect(h.onWeightedScore).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Cancel / Foul Board" }));
    expect(h.onCancelBoard).toHaveBeenCalledTimes(1);
  });

  it("hides the teams-removal branch when no handler is provided", () => {
    renderHub();
    expect(
      screen.queryByRole("button", { name: "Board Not Played (Teams)" }),
    ).not.toBeInTheDocument();
  });

  it("shows and routes the teams branches when their handlers are provided", () => {
    const onRemoveTeamsBoard = vi.fn();
    const onVoidTeamsMatch = vi.fn();
    render(
      <StepAdjustmentType
        onEnterContract={vi.fn()}
        onAdjustedScore={vi.fn()}
        onWeightedScore={vi.fn()}
        onCancelBoard={vi.fn()}
        onRemoveTeamsBoard={onRemoveTeamsBoard}
        onVoidTeamsMatch={onVoidTeamsMatch}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Board Not Played (Teams)" }),
    );
    expect(onRemoveTeamsBoard).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Void Match (Teams)" }));
    expect(onVoidTeamsMatch).toHaveBeenCalledTimes(1);
  });

  it("hides the void-match branch when no handler is provided", () => {
    renderHub();
    expect(
      screen.queryByRole("button", { name: "Void Match (Teams)" }),
    ).not.toBeInTheDocument();
  });

  it("hides the mismatch branch when no handler is provided", () => {
    renderHub();
    expect(
      screen.queryByRole("button", { name: "Mismatch (Swiss)" }),
    ).not.toBeInTheDocument();
  });

  it("shows and routes the mismatch branch when its handler is provided", () => {
    const onMismatch = vi.fn();
    render(
      <StepAdjustmentType
        onEnterContract={vi.fn()}
        onAdjustedScore={vi.fn()}
        onWeightedScore={vi.fn()}
        onCancelBoard={vi.fn()}
        onMismatch={onMismatch}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Mismatch (Swiss)" }));
    expect(onMismatch).toHaveBeenCalledTimes(1);
  });
});
