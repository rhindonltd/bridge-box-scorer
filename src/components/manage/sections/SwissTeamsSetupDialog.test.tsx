import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  SwissTeamsSetupDialog,
  resolveTeamsOddRoundPlan,
} from "./SwissTeamsSetupDialog";

/** Render the dialog open with sensible defaults, returning the confirm spy. */
function renderDialog(
  props: Partial<React.ComponentProps<typeof SwissTeamsSetupDialog>> = {},
) {
  const onConfirm = vi.fn();
  render(
    <SwissTeamsSetupDialog
      open
      teams={5}
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

describe("SwissTeamsSetupDialog", () => {
  it("defaults to a bye and omits the plan on confirm", () => {
    const { onConfirm } = renderDialog();

    // The per-round plan is hidden under the default (bye) handling.
    expect(screen.queryByTestId("teams-odd-round-plan")).not.toBeInTheDocument();

    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      teams: 5,
      rounds: 7,
      boardsPerRound: 6,
      oddHandling: "BYE",
    });
  });

  it("reveals the per-round plan and emits a full all-SHORT plan under Triple", () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /triple/i }));
    expect(screen.getByTestId("teams-odd-round-plan")).toBeInTheDocument();

    fireEvent.click(confirmButton());

    expect(onConfirm).toHaveBeenCalledWith({
      teams: 5,
      rounds: 7,
      boardsPerRound: 6,
      oddHandling: "TRIPLE",
      oddRoundPlan: Array(7).fill("SHORT"),
    });
  });

  it("emits grouped LONG entries when two adjacent rounds are set to Long", () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /triple/i }));
    expect(screen.getByTestId("teams-odd-round-plan")).toBeInTheDocument();

    // Set rounds 1 and 2 to Long (a long triple spanning them).
    fireEvent.click(
      screen.getByRole("radio", { name: "Long for round 1" }),
    );
    fireEvent.click(
      screen.getByRole("radio", { name: "Long for round 2" }),
    );

    fireEvent.click(confirmButton());

    const spec = onConfirm.mock.calls[0][0];
    expect(spec.oddRoundPlan[0]).toEqual({ kind: "LONG", group: 0 });
    expect(spec.oddRoundPlan[1]).toEqual({ kind: "LONG", group: 0 });
    expect(spec.oddRoundPlan.slice(2)).toEqual(Array(5).fill("SHORT"));
  });

  it("blocks confirm on a lone LONG round until it is paired", () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /triple/i }));
    expect(screen.getByTestId("teams-odd-round-plan")).toBeInTheDocument();

    // Round 1 Long, round 2 left as Short -> unpaired long -> invalid.
    fireEvent.click(
      screen.getByRole("radio", { name: "Long for round 1" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/long triple takes two/i);
    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(onConfirm).not.toHaveBeenCalled();

    // Pairing round 2 as Long clears the error and allows confirm.
    fireEvent.click(
      screen.getByRole("radio", { name: "Long for round 2" }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(confirmButton()).toBeEnabled();
  });

  it("blocks a Triple with too few teams to form a three-way", () => {
    const { onConfirm } = renderDialog({ teams: 1 });

    // An odd field of one team can't form a triple; selecting it blocks.
    fireEvent.click(screen.getByRole("radio", { name: /triple/i }));
    expect(screen.getByRole("alert")).toHaveTextContent(/needs at least three/i);
    expect(confirmButton()).toBeDisabled();
    fireEvent.click(confirmButton());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("hides the odd-team options entirely for an even field", () => {
    renderDialog({ teams: 6 });
    expect(screen.queryByRole("radio", { name: /triple/i })).not.toBeInTheDocument();
    expect(screen.queryByTestId("teams-odd-round-plan")).not.toBeInTheDocument();
  });

  it("re-opens with an existing Triple plan selected", () => {
    renderDialog({
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

    expect(screen.getByRole("radio", { name: /triple/i })).toBeChecked();
    expect(screen.getByTestId("teams-odd-round-plan")).toBeInTheDocument();
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
});
