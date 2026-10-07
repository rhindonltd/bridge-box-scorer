"use client";

import { useState } from "react";
import { StepperInput } from "@/components/common/StepperInput";
import type {
  SwissMovementSpec,
  SwissPairsOddHandling,
  SwissPairsOddRound,
} from "@/model/selected-movement";

/**
 * Swiss Pairs setup, shown inline on the Movements tab when the event is a
 * Swiss Pairs game. Unlike the standard movements (chosen from ready-made
 * cards), a Swiss movement has no fixed schedule to preview — only round 1 is
 * known up front and each later round is drawn as the event runs. So the
 * director just sets the size here: how many rounds to play and how many boards
 * each round. `tables` is fixed to the section's table count (shown read-only;
 * the director changes it on the Tables step). Confirming hands back a
 * {@link SwissMovementSpec}.
 *
 * The director also chooses how an ODD number of pairs is handled: "Bye" (the
 * default — one pair sits each round for an average-plus) or "2 half matches"
 * (three pairs play two half matches each round). Choosing "2 half matches"
 * reveals a per-round plan so the director can set bye or half-matches for each
 * round individually (the EBU recommendation varies this across the event).
 * The pair count is not known at setup (seating is a later step), so this is
 * always offered; it is simply ignored when the field turns out even.
 */
export function SwissSetupForm({
  tables,
  initial,
  saving,
  onConfirm,
}: {
  /** The section's table count; the Swiss field is sized to it. */
  tables: number;
  /** Existing spec when the section already has a Swiss movement, else defaults. */
  initial?: SwissMovementSpec | null;
  saving: boolean;
  onConfirm: (spec: SwissMovementSpec) => void;
}) {
  const [rounds, setRounds] = useState(initial?.rounds ?? 7);
  const [boardsPerRound, setBoardsPerRound] = useState(
    initial?.boardsPerRound ?? 7,
  );
  const [oddHandling, setOddHandling] = useState<SwissPairsOddHandling>(
    initial?.oddHandling ?? "BYE",
  );
  // The per-round plan (one entry per round) used only under "2 half matches".
  // Seed from an existing plan, else default every round to a half match (the
  // director can toggle any round to a bye). Kept length-synced to `rounds`.
  const [plan, setPlan] = useState<SwissPairsOddRound[]>(
    initial?.oddRoundPlan ?? [],
  );

  // Resize the plan to match the round count, padding new rounds with a half
  // match and truncating removed ones.
  const changeRounds = (next: number) => {
    setRounds(next);
    setPlan((current) =>
      Array.from({ length: next }, (_, i) => current[i] ?? "HALF_MATCHES"),
    );
  };

  const setRoundPlan = (index: number, value: SwissPairsOddRound) => {
    setPlan((current) => {
      const next = Array.from(
        { length: rounds },
        (_, i) => current[i] ?? "HALF_MATCHES",
      );
      next[index] = value;
      return next;
    });
  };

  const confirm = () => {
    const spec: SwissMovementSpec = { tables, rounds, boardsPerRound };
    if (oddHandling === "HALF_MATCHES") {
      // Carry the full per-round plan (length === rounds, padded as above).
      spec.oddHandling = "HALF_MATCHES";
      spec.oddRoundPlan = Array.from(
        { length: rounds },
        (_, i) => plan[i] ?? "HALF_MATCHES",
      );
    }
    // "BYE" is the default and needs no plan, so the spec stays minimal.
    onConfirm(spec);
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700">Tables</span>
            <div className="w-40">
              <StepperInput
                label="Tables"
                value={tables}
                /* v8 ignore next -- readOnly StepperInput never calls onChange (the
                   table count is edited on the Tables step). */
                onChange={() => {}}
                readOnly
              />
            </div>
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700">Rounds</span>
            <div className="w-40">
              <StepperInput
                label="Rounds"
                value={rounds}
                onChange={changeRounds}
                min={1}
                max={30}
              />
            </div>
          </label>

          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700">
              Boards per round
            </span>
            <div className="w-40">
              <StepperInput
                label="Boards per round"
                value={boardsPerRound}
                onChange={setBoardsPerRound}
                min={1}
                max={27}
              />
            </div>
          </label>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium text-gray-700">
            If you have an odd number of pairs, how should each round handle the
            odd pair?
          </legend>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="swissOddHandling"
              value="BYE"
              checked={oddHandling === "BYE"}
              onChange={() => setOddHandling("BYE")}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">Bye</span> — one pair sits out each
              round (the lowest-ranked pair without a prior bye) and is credited
              an average-plus result.
            </span>
          </label>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="swissOddHandling"
              value="HALF_MATCHES"
              checked={oddHandling === "HALF_MATCHES"}
              onChange={() => setOddHandling("HALF_MATCHES")}
              className="mt-0.5"
            />
            <span>
              <span className="font-medium">2 half matches</span> — three pairs
              play two half matches each round (one pair plays the full round
              against a different opponent in each half). Set this per round
              below.
            </span>
          </label>

          {oddHandling === "HALF_MATCHES" && (
            <div
              className="mt-2 rounded-lg border border-gray-200 p-3"
              data-testid="odd-round-plan"
            >
              <p className="mb-2 text-xs text-gray-500">
                Choose how each round resolves an odd pair. This only applies if
                your field is odd.
              </p>
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="bg-gray-100 text-xs font-medium uppercase tracking-wide text-gray-600">
                    <th className="w-14 px-2 py-1.5 text-left font-medium">
                      Round
                    </th>
                    <th className="px-2 py-1.5 text-center font-medium">Bye</th>
                    <th className="px-2 py-1.5 text-center font-medium">
                      Half matches
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: rounds }, (_, i) => {
                    const value = plan[i] ?? "HALF_MATCHES";
                    return (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-1.5 text-gray-700">{i + 1}</td>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="radio"
                            aria-label={`Bye for round ${i + 1}`}
                            name={`oddRound-${i}`}
                            value="BYE"
                            checked={value === "BYE"}
                            onChange={() => setRoundPlan(i, "BYE")}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <input
                            type="radio"
                            aria-label={`Half matches for round ${i + 1}`}
                            name={`oddRound-${i}`}
                            value="HALF_MATCHES"
                            checked={value === "HALF_MATCHES"}
                            onChange={() => setRoundPlan(i, "HALF_MATCHES")}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </fieldset>

        <p className="text-xs text-gray-500">
          To keep a pair at a fixed table for the whole event, mark them as
          stationary on the Tables step.
        </p>
      </div>

      <div className="flex shrink-0 justify-end gap-2 border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={confirm}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Select Movement"}
        </button>
      </div>
    </>
  );
}
