import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SwissSetupDialog } from "./SwissSetupDialog";

/** Render the dialog open with sensible defaults, returning the confirm spy. */
function renderDialog(
  props: Partial<React.ComponentProps<typeof SwissSetupDialog>> = {},
) {
  const onConfirm = vi.fn();
  render(
    <SwissSetupDialog
      open
      tables={5}
      saving={false}
      onCancel={vi.fn()}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm };
}

const confirmButton = () =>
  screen.getByRole("button", { name: "Select Movement" });

describe("SwissSetupDialog", () => {
  it("defaults to a bye and omits the per-round plan on confirm", () => {
    const { onConfirm } = renderDialog();

    // The per-round plan is hidden under the default (bye) handling.
    expect(screen.queryByTestId("odd-round-plan")).not.toBeInTheDocument();

    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      tables: 5,
      rounds: 7,
      boardsPerRound: 7,
    });
  });

  it("reveals the per-round plan and emits HALF_MATCHES with a full plan", () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /2 half matches/i }));

    // The per-round plan appears, one entry per round (default 7).
    const plan = screen.getByTestId("odd-round-plan");
    expect(plan).toBeInTheDocument();

    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      tables: 5,
      rounds: 7,
      boardsPerRound: 7,
      oddHandling: "HALF_MATCHES",
      // Default: every round a half match.
      oddRoundPlan: Array(7).fill("HALF_MATCHES"),
    });
  });

  it("lets the director set an individual round to a bye", () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /2 half matches/i }));
    // Round 1's "Bye" radio — scoped to the per-round plan (the top-level
    // handling also has a "Bye" radio).
    const plan = screen.getByTestId("odd-round-plan");
    const round1Bye = within(plan)
      .getAllByRole("radio", { name: "Bye" })[0];
    fireEvent.click(round1Bye);

    fireEvent.click(confirmButton());

    const spec = onConfirm.mock.calls[0][0];
    expect(spec.oddHandling).toBe("HALF_MATCHES");
    expect(spec.oddRoundPlan[0]).toBe("BYE");
    expect(spec.oddRoundPlan.slice(1)).toEqual(Array(6).fill("HALF_MATCHES"));
  });

  it("resizes the per-round plan when the round count changes", () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /2 half matches/i }));
    // Drop to 3 rounds via the Rounds input (the number field, not the label).
    fireEvent.change(screen.getByRole("spinbutton", { name: "Rounds" }), {
      target: { value: "3" },
    });

    fireEvent.click(confirmButton());

    const spec = onConfirm.mock.calls[0][0];
    expect(spec.rounds).toBe(3);
    expect(spec.oddRoundPlan).toEqual(Array(3).fill("HALF_MATCHES"));
  });

  it("re-opens with an existing HALF_MATCHES plan selected", () => {
    renderDialog({
      initial: {
        tables: 5,
        rounds: 3,
        boardsPerRound: 3,
        oddHandling: "HALF_MATCHES",
        oddRoundPlan: ["BYE", "HALF_MATCHES", "BYE"],
      },
    });

    // The half-matches handling is pre-selected and the plan is shown.
    expect(
      screen.getByRole("radio", { name: /2 half matches/i }),
    ).toBeChecked();
    expect(screen.getByTestId("odd-round-plan")).toBeInTheDocument();
  });
});
