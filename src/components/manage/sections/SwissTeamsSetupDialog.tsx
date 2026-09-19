"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { StepperInput } from "@/components/common/StepperInput";
import type { SwissTeamsMovementSpec } from "@/model/selected-movement";

/**
 * Setup popup for a Swiss Teams movement. A team is the two pairs seated at one
 * table, so the team count equals the section's table count (shown read-only;
 * the director changes it on the Tables step). Like Swiss Pairs there is no
 * schedule to preview — round 1 is a random draw and each later round is drawn
 * from the standings as the event runs. Confirming hands back a
 * {@link SwissTeamsMovementSpec}.
 *
 * Swiss Teams needs an even number of teams (each match pits two teams across
 * two tables); an odd count is flagged here and blocks confirming.
 */
export function SwissTeamsSetupDialog({
  open,
  teams,
  initial,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  /** The section's table count = the number of teams; sized to the room. */
  teams: number;
  /** Existing spec when re-opening to edit, else sensible defaults. */
  initial?: SwissTeamsMovementSpec | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (spec: SwissTeamsMovementSpec) => void;
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
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white shadow-xl">
              {open && (
                <SwissTeamsSetupForm
                  teams={teams}
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

function SwissTeamsSetupForm({
  teams,
  initial,
  saving,
  onCancel,
  onConfirm,
}: {
  teams: number;
  initial?: SwissTeamsMovementSpec | null;
  saving: boolean;
  onCancel: () => void;
  onConfirm: (spec: SwissTeamsMovementSpec) => void;
}) {
  const [rounds, setRounds] = useState(initial?.rounds ?? 7);
  const [boardsPerRound, setBoardsPerRound] = useState(
    initial?.boardsPerRound ?? 6,
  );

  const oddTeams = teams % 2 !== 0;

  return (
    <>
      <Dialog.Title className="rounded-t-2xl bg-gray-300 p-4 text-md font-bold text-gray-800">
        Swiss Teams
      </Dialog.Title>

      <div className="space-y-4 p-4">
        <p className="text-sm text-gray-600">
          In Swiss Teams, the two pairs at each table make up a team. Each round
          two teams play the same boards in two rooms, then you draw the next
          round based on the standings. Set the size below; you&apos;ll draw
          each round as the event runs.
        </p>

        <div className="space-y-3">
          <label className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-gray-700">Teams</span>
            <div className="w-40">
              <StepperInput
                label="Teams"
                value={teams}
                /* v8 ignore next -- readOnly StepperInput never calls onChange (the
                   team count is derived from the section's table count). */
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
                onChange={setRounds}
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
                max={16}
              />
            </div>
          </label>
        </div>

        {oddTeams && (
          <p role="alert" className="text-sm font-medium text-red-600">
            Swiss Teams needs an even number of teams — you currently have{" "}
            {teams}. Adjust the tables on the Tables step before starting.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-gray-200 p-4">
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
          onClick={() => onConfirm({ teams, rounds, boardsPerRound })}
          disabled={saving || oddTeams}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Select Movement"}
        </button>
      </div>
    </>
  );
}
