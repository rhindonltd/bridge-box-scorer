"use client";

import { useState } from "react";
import { StepperInput } from "@/components/common/StepperInput";
import { OddRoundOptionInfo } from "./OddRoundOptionInfo";
import type {
  SwissMovementSpec,
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
 * The director also chooses, round by round, how an ODD number of pairs is
 * handled: a bye (the default — one pair sits out for an average-plus) or half
 * matches (three pairs play two half matches). The EBU recommendation varies
 * this across the event. A bye every round is saved as the plain "Bye"
 * handling; any half-match round saves "2 half matches" with the per-round
 * plan. The pair count is not known at setup (seating is a later step), so the
 * table is always shown; it is simply ignored when the field turns out even.
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
  // How each round handles an odd pair: a bye or half matches. Seeded from an
  // existing "2 half matches" plan, else a bye every round (the default). Kept
  // length-synced to `rounds`.
  const [plan, setPlan] = useState<SwissPairsOddRound[]>(() => {
    const seeded =
      initial?.oddHandling === "HALF_MATCHES" ? initial.oddRoundPlan : [];
    return Array.from(
      { length: initial?.rounds ?? 7 },
      (_, i) => seeded?.[i] ?? ("BYE" as const),
    );
  });

  // Resize the plan to match the round count, padding new rounds with a bye
  // and truncating removed ones.
  const changeRounds = (next: number) => {
    setRounds(next);
    setPlan((current) =>
      Array.from({ length: next }, (_, i) => current[i] ?? "BYE"),
    );
  };

  const setRoundPlan = (index: number, value: SwissPairsOddRound) => {
    setPlan((current) => {
      const next = Array.from(
        { length: rounds },
        /* v8 ignore next -- unreachable fallback: `plan` is always length-synced to `rounds` */
        (_, i) => current[i] ?? "BYE",
      );
      next[index] = value;
      return next;
    });
  };

  const confirm = () => {
    const spec: SwissMovementSpec = { tables, rounds, boardsPerRound };
    const roundPlan = Array.from(
      { length: rounds },
      /* v8 ignore next -- unreachable fallback: `plan` is always length-synced to `rounds` */
      (_, i) => plan[i] ?? "BYE",
    );
    // A bye every round is the default and needs no plan, so the spec stays
    // minimal; any half-match round carries the whole per-round plan.
    if (roundPlan.some((round) => round === "HALF_MATCHES")) {
      spec.oddHandling = "HALF_MATCHES";
      spec.oddRoundPlan = roundPlan;
    }
    onConfirm(spec);
  };

  return (
    <>
      {/* The settings sit in the middle of the space when they fit, and
          scroll from the top when they don't (`my-auto` on a scrolling column
          centres without clipping the top). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4">
        <div className="my-auto w-full space-y-4">
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

          <fieldset className="space-y-2" data-testid="odd-round-plan">
            <legend className="text-sm font-medium text-gray-700">
              If you have an odd number of pairs, how should each round handle
              the odd pair?
            </legend>
            <table className="w-full table-fixed text-sm">
              <thead>
                <tr className="bg-gray-100 text-xs font-medium uppercase tracking-wide text-gray-600">
                  <th className="w-14 px-2 py-1.5 text-left font-medium">
                    Round
                  </th>
                  <th className="px-2 py-1.5 text-center font-medium">
                    <OddRoundOptionInfo option="Bye">
                      <p>
                        One pair sits out the round: the lowest-ranked pair that
                        hasn&apos;t yet had a bye. They are credited an
                        average-plus result for the round.
                      </p>
                      <p>This only applies if your field is odd.</p>
                    </OddRoundOptionInfo>
                  </th>
                  <th className="px-2 py-1.5 text-center font-medium">
                    <OddRoundOptionInfo option="Half matches">
                      <p>
                        Three pairs play two half matches at one table, so no
                        pair sits out the whole round. One pair plays the full
                        round, against a different opponent in each half.
                      </p>
                      <p>
                        The other two pairs each play one half, and are credited
                        an average-plus result for the half they miss.
                      </p>
                      <p>This only applies if your field is odd.</p>
                    </OddRoundOptionInfo>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rounds }, (_, i) => {
                  /* v8 ignore next -- unreachable fallback: `plan` is always length-synced to `rounds` */
                  const value = plan[i] ?? "BYE";
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
          </fieldset>

          <p className="text-xs text-gray-500">
            To keep a pair at a fixed table for the whole event, mark them as
            stationary on the Tables step.
          </p>
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 p-4">
        <button
          type="button"
          onClick={confirm}
          disabled={saving}
          className="w-full rounded-xl bg-blue-600 py-3.5 text-lg font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Select Movement"}
        </button>
      </div>
    </>
  );
}
