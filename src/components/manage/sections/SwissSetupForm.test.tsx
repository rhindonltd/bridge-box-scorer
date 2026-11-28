import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SwissSetupForm } from "./SwissSetupForm";

/** Render the form with sensible defaults, returning the confirm spy. */
function renderForm(
  props: Partial<React.ComponentProps<typeof SwissSetupForm>> = {},
) {
  const onConfirm = vi.fn();
  render(
    <SwissSetupForm
      tables={5}
      saving={false}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm };
}

const confirmButton = () =>
  screen.getByRole("button", { name: "Select Movement" });

describe("SwissSetupForm", () => {
  it("always shows the per-round plan, defaulting every round to a bye", () => {
    const { onConfirm } = renderForm();

    const plan = screen.getByTestId("odd-round-plan");
    // No separate handling choice: the table is the only control.
    expect(screen.getAllByRole("radio")).toHaveLength(14);
    for (let round = 1; round <= 7; round++) {
      expect(
        within(plan).getByRole("radio", { name: `Bye for round ${round}` }),
      ).toBeChecked();
    }

    fireEvent.click(confirmButton());

    // A bye every round is the default handling, so the spec stays minimal.
    expect(onConfirm).toHaveBeenCalledWith({
      tables: 5,
      rounds: 7,
      boardsPerRound: 7,
    });
  });

  it("emits HALF_MATCHES with the full plan once any round uses half matches", () => {
    const { onConfirm } = renderForm();

    fireEvent.click(
      screen.getByRole("radio", { name: "Half matches for round 2" }),
    );
    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      tables: 5,
      rounds: 7,
      boardsPerRound: 7,
      oddHandling: "HALF_MATCHES",
      oddRoundPlan: ["BYE", "HALF_MATCHES", "BYE", "BYE", "BYE", "BYE", "BYE"],
    });
  });

  it("returns to the minimal spec when a half-match round goes back to a bye", () => {
    const { onConfirm } = renderForm();
    fireEvent.click(
      screen.getByRole("radio", { name: "Half matches for round 1" }),
    );
    fireEvent.click(screen.getByRole("radio", { name: "Bye for round 1" }));
    fireEvent.click(confirmButton());
    expect(onConfirm.mock.calls[0][0].oddHandling).toBeUndefined();
    expect(onConfirm.mock.calls[0][0].oddRoundPlan).toBeUndefined();
  });

  it("resizes the per-round plan when the round count changes, padding with byes", () => {
    const { onConfirm } = renderForm();

    fireEvent.click(
      screen.getByRole("radio", { name: "Half matches for round 1" }),
    );
    const rounds = screen.getByRole("spinbutton", { name: "Rounds" });
    // Drop to 2 rounds, then grow to 4: the new rounds are byes.
    fireEvent.change(rounds, { target: { value: "2" } });
    fireEvent.change(rounds, { target: { value: "4" } });

    expect(
      screen.queryByRole("radio", { name: "Bye for round 5" }),
    ).not.toBeInTheDocument();

    fireEvent.click(confirmButton());

    const spec = onConfirm.mock.calls[0][0];
    expect(spec.rounds).toBe(4);
    expect(spec.oddRoundPlan).toEqual(["HALF_MATCHES", "BYE", "BYE", "BYE"]);
  });

  it("seeds from an existing HALF_MATCHES plan", () => {
    renderForm({
      initial: {
        tables: 5,
        rounds: 3,
        boardsPerRound: 3,
        oddHandling: "HALF_MATCHES",
        oddRoundPlan: ["BYE", "HALF_MATCHES", "BYE"],
      },
    });

    expect(
      screen.getByRole("radio", { name: "Bye for round 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Half matches for round 2" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Bye for round 3" }),
    ).toBeChecked();
  });

  it("defaults rounds missing from a short persisted plan to a bye", () => {
    renderForm({
      initial: {
        tables: 5,
        rounds: 3,
        boardsPerRound: 3,
        oddHandling: "HALF_MATCHES",
        oddRoundPlan: ["HALF_MATCHES"],
      },
    });
    expect(
      screen.getByRole("radio", { name: "Bye for round 3" }),
    ).toBeChecked();
  });

  it("ignores a plan saved with the bye handling", () => {
    renderForm({
      initial: {
        tables: 5,
        rounds: 2,
        boardsPerRound: 3,
        oddHandling: "BYE",
        oddRoundPlan: ["HALF_MATCHES", "HALF_MATCHES"],
      },
    });
    expect(
      screen.getByRole("radio", { name: "Bye for round 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Bye for round 2" }),
    ).toBeChecked();
  });

  it("explains each option from an info button on its column heading", async () => {
    renderForm();

    fireEvent.click(
      screen.getByRole("button", { name: "What does Half matches mean?" }),
    );
    expect(await screen.findByRole("dialog")).toHaveTextContent(
      /two half matches/,
    );
    expect(
      screen.getByRole("button", { name: "What does Bye mean?" }),
    ).toBeInTheDocument();
  });

  it("shows a disabled Saving button while a save is in flight", () => {
    renderForm({ saving: true });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
