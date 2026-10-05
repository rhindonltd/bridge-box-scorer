"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { StepperInput } from "@/components/common/StepperInput";
import type {
  SwissMovementSpec,
  SwissPairsOddHandling,
  SwissPairsOddRound,
} from "@/model/selected-movement";

/**
 * Setup popup for a Swiss Pairs movement. Unlike the other movements (chosen
 * from ready-made cards), a Swiss movement has no fixed schedule to preview —
 * only round 1 is known up front and each later round is drawn as the event
 * runs. So the director just sets the size here: how many tables, how many
 * rounds to play, and how many boards each round.
 *
 * `tables` is fixed to the section's table count (the room as laid out), shown
 * read-only; the director changes it on the Tables step. Confirming hands back
 * a {@link SwissMovementSpec}.
 *
 * The director also chooses how an ODD number of pairs is handled: "Bye" (the
 * default — one pair sits each round for an average-plus) or "2 half matches"
 * (three pairs play two half matches each round). Choosing "2 half matches"
 * reveals a per-round plan so the director can set bye or half-matches for each
 * round individually (the EBU recommendation varies this across the event).
 * The pair count is not known at setup (seating is a later step), so this is
 * always offered; it is simply ignored when the field turns out even.
 */
export function SwissSetupDialog({
  open,
  tables,
  initial,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** The section's table count; the Swiss field is sized to it. */
  tables: number;
  /** Existing spec when re-opening to edit, else sensible defaults. */
  initial?: SwissMovementSpec | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (spec: SwissMovementSpec) => void;
}) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onCancel} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              {/* Mounted only while open, so its fields seed from `initial`
                  each time the dialog opens without a state-syncing effect. */}
              {open && (
                <SwissSetupForm
                  tables={tables}
                  initial={initial}
                  saving={saving}
                  onCancel={onCancel}
                  onConfirm={onConfirm}
                />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

/**
 * The Swiss setup form body. Its numeric fields initialise from `initial` (or
 * sensible defaults) on mount; the parent only mounts it while the dialog is
 * open, so reopening for a section starts from that section's current values.
 */
function SwissSetupForm({
  tables,
  initial,
  saving,
  onCancel,
  onConfirm,
}: {
  tables: number;
  initial?: SwissMovementSpec | null;
  saving: boolean;
  onCancel: () => void;
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
      Array.from(
        { length: next },
        (_, i) => current[i] ?? "HALF_MATCHES",
      ),
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
      <Dialog.Title className="shrink-0 rounded-t-2xl bg-gray-300 p-4 text-md font-bold text-gray-800">
        Swiss Pairs
      </Dialog.Title>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-sm text-gray-600">
          In Swiss Pairs, every pair plays the same boards each round, then you
          draw the next round based on the standings. Set the size below;
          you&apos;ll draw each round as the event runs.
        </p>

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
              <ul className="space-y-1.5">
                {Array.from({ length: rounds }, (_, i) => {
                  const value = plan[i] ?? "HALF_MATCHES";
                  return (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="text-sm text-gray-700">
                        Round {i + 1}
                      </span>
                      <div className="flex gap-3 text-sm">
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            name={`oddRound-${i}`}
                            value="BYE"
                            checked={value === "BYE"}
                            onChange={() => setRoundPlan(i, "BYE")}
                          />
                          Bye
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            name={`oddRound-${i}`}
                            value="HALF_MATCHES"
                            checked={value === "HALF_MATCHES"}
                            onChange={() => setRoundPlan(i, "HALF_MATCHES")}
                          />
                          Half matches
                        </label>
                      </div>
                    </li>
                  );
                })}
              </ul>
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
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          Cancel
        </button>
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
