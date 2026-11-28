import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  SwissTeamsSetupForm,
  resolveTeamsOddRoundPlan,
} from "./SwissTeamsSetupForm";

/** Render the form with sensible defaults, returning the confirm spy. */
function renderForm(
  props: Partial<React.ComponentProps<typeof SwissTeamsSetupForm>> = {},
) {
  const onConfirm = vi.fn();
  render(
    <SwissTeamsSetupForm
      teams={5}
      saving={false}
      onConfirm={onConfirm}
      {...props}
    />,
  );
  return { onConfirm };
}

const confirmButton = () =>
  screen.getByRole("button", { name: "Select Movement" });

describe("resolveTeamsOddRoundPlan", () => {
  it("passes BYE and SHORT entries straight through", () => {
    const { plan, valid } = resolveTeamsOddRoundPlan(["BYE", "SHORT", "BYE"]);
    expect(valid).toBe(true);
    expect(plan).toEqual(["BYE", "SHORT", "BYE"]);
  });

  it("pairs two adjacent LONG rounds into one group", () => {
    const { plan, valid } = resolveTeamsOddRoundPlan([
      "SHORT",
      "LONG",
      "LONG",
      "BYE",
    ]);
    expect(valid).toBe(true);
    expect(plan).toEqual([
      "SHORT",
      { kind: "LONG", group: 0 },
      { kind: "LONG", group: 0 },
      "BYE",
    ]);
  });

  it("gives two back-to-back long triples distinct groups", () => {
    const { plan, valid } = resolveTeamsOddRoundPlan([
      "LONG",
      "LONG",
      "LONG",
      "LONG",
    ]);
    expect(valid).toBe(true);
    expect(plan).toEqual([
      { kind: "LONG", group: 0 },
      { kind: "LONG", group: 0 },
      { kind: "LONG", group: 1 },
      { kind: "LONG", group: 1 },
    ]);
  });

  it("marks a lone LONG (no adjacent LONG) invalid", () => {
    const { valid } = resolveTeamsOddRoundPlan(["LONG", "SHORT"]);
    expect(valid).toBe(false);
  });

  it("marks an odd trailing LONG invalid", () => {
    const { valid } = resolveTeamsOddRoundPlan(["LONG", "LONG", "LONG"]);
    expect(valid).toBe(false);
  });
});

describe("SwissTeamsSetupForm", () => {
  it("shows the per-round plan for an odd field, defaulting every round to a bye", () => {
    const { onConfirm } = renderForm();

    expect(screen.getByTestId("teams-odd-round-plan")).toBeInTheDocument();
    // No separate handling choice: the table is the only control.
    expect(screen.getAllByRole("radio")).toHaveLength(21);
    for (let round = 1; round <= 7; round++) {
      expect(
        screen.getByRole("radio", { name: `Bye for round ${round}` }),
      ).toBeChecked();
    }

    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      teams: 5,
      rounds: 7,
      boardsPerRound: 6,
      oddHandling: "BYE",
    });
  });

  it("emits TRIPLE with the full plan once any round is Short", () => {
    const { onConfirm } = renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Short for round 3" }));
    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      teams: 5,
      rounds: 7,
      boardsPerRound: 6,
      oddHandling: "TRIPLE",
      oddRoundPlan: ["BYE", "BYE", "SHORT", "BYE", "BYE", "BYE", "BYE"],
    });
  });

  it("emits grouped LONG entries when two adjacent rounds are set to Long", () => {
    const { onConfirm } = renderForm();

    fireEvent.click(screen.getByRole("radio", { name: "Long for round 1" }));
    fireEvent.click(screen.getByRole("radio", { name: "Long for round 2" }));

    fireEvent.click(confirmButton());

    const spec = onConfirm.mock.calls[0][0];
    expect(spec.oddHandling).toBe("TRIPLE");
    expect(spec.oddRoundPlan[0]).toEqual({ kind: "LONG", group: 0 });
    expect(spec.oddRoundPlan[1]).toEqual({ kind: "LONG", group: 0 });
    expect(spec.oddRoundPlan.slice(2)).toEqual(Array(5).fill("BYE"));
  });

  it("blocks confirm on a lone LONG round until it is paired", () => {
    const { onConfirm } = renderForm();

    // Round 1 Long, round 2 left as a bye -> unpaired long -> invalid.
    fireEvent.click(screen.getByRole("radio", { name: "Long for round 1" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      /long triple takes two/i,
    );
    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(onConfirm).not.toHaveBeenCalled();

    // Pairing round 2 as Long clears the error and allows confirm.
    fireEvent.click(screen.getByRole("radio", { name: "Long for round 2" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  it("blocks a triple with too few teams to form a three-way", () => {
    const { onConfirm } = renderForm({ teams: 1 });

    // A bye every round is fine for one team.
    expect(confirmButton()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("radio", { name: "Short for round 1" }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      /needs at least three/i,
    );
    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("hides the odd-team options entirely for an even field", () => {
    renderForm({ teams: 6 });
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(
      screen.queryByTestId("teams-odd-round-plan"),
    ).not.toBeInTheDocument();
  });

  it("seeds from an existing Triple plan", () => {
    renderForm({
      initial: {
        teams: 5,
        rounds: 4,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: [
          "SHORT",
          { kind: "LONG", group: 0 },
          { kind: "LONG", group: 0 },
          "BYE",
        ],
      },
    });

    expect(
      screen.getByRole("radio", { name: "Short for round 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Long for round 2" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Long for round 3" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Bye for round 4" }),
    ).toBeChecked();
  });

  it("ignores a plan saved with the bye handling", () => {
    renderForm({
      initial: {
        teams: 5,
        rounds: 2,
        boardsPerRound: 6,
        oddHandling: "BYE",
        oddRoundPlan: ["SHORT", "SHORT"],
      },
    });
    expect(
      screen.getByRole("radio", { name: "Bye for round 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Bye for round 2" }),
    ).toBeChecked();
  });

  it("returns to the bye handling when every round goes back to a bye", () => {
    const { onConfirm } = renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Short for round 3" }));
    fireEvent.click(screen.getByRole("radio", { name: "Bye for round 3" }));
    fireEvent.click(confirmButton());
    expect(onConfirm.mock.calls[0][0].oddHandling).toBe("BYE");
    expect(onConfirm.mock.calls[0][0].oddRoundPlan).toBeUndefined();
  });

  it("resizes the plan when the round count changes, padding with byes", () => {
    const { onConfirm } = renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Short for round 1" }));
    const rounds = screen.getByRole("spinbutton", { name: "Rounds" });
    fireEvent.change(rounds, { target: { value: "3" } });
    fireEvent.change(rounds, { target: { value: "5" } });
    fireEvent.click(confirmButton());
    expect(onConfirm.mock.calls[0][0].oddRoundPlan).toEqual([
      "SHORT",
      "BYE",
      "BYE",
      "BYE",
      "BYE",
    ]);
  });

  it("defaults rounds missing from a short persisted plan to a bye", () => {
    renderForm({
      initial: {
        teams: 5,
        rounds: 3,
        boardsPerRound: 6,
        oddHandling: "TRIPLE",
        oddRoundPlan: ["SHORT"],
      },
    });
    expect(
      screen.getByRole("radio", { name: "Short for round 1" }),
    ).toBeChecked();
    expect(
      screen.getByRole("radio", { name: "Bye for round 3" }),
    ).toBeChecked();
  });

  it("confirms an even field without any odd handling", () => {
    const { onConfirm } = renderForm({ teams: 6 });
    fireEvent.click(confirmButton());
    expect(onConfirm).toHaveBeenCalledWith({
      teams: 6,
      rounds: 7,
      boardsPerRound: 6,
    });
  });

  it("explains each option from an info button on its column heading", async () => {
    renderForm();

    for (const [option, text] of [
      ["Bye", /sits out the round/],
      ["Short", /in this one round/],
      ["Long", /two neighbouring rounds/],
    ] as const) {
      fireEvent.click(
        screen.getByRole("button", { name: `What does ${option} mean?` }),
      );
      expect(await screen.findByRole("dialog")).toHaveTextContent(text);
      fireEvent.click(screen.getByRole("button", { name: "OK" }));
      await waitFor(() =>
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      );
    }
  });

  it("shows a disabled Saving button while a save is in flight", () => {
    renderForm({ saving: true });
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
