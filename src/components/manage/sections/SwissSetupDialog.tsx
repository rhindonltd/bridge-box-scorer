"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { StepperInput } from "@/components/common/StepperInput";
import type { SwissMovementSpec } from "@/model/selected-movement";

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
            <Dialog.Panel className="w-full max-w-md rounded-2xl bg-white shadow-xl">
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
    initial?.boardsPerRound ?? 3,
  );

  return (
    <>
      <Dialog.Title className="rounded-t-2xl bg-gray-300 p-4 text-md font-bold text-gray-800">
        Swiss Pairs
      </Dialog.Title>

      <div className="space-y-4 p-4">
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
                max={12}
              />
            </div>
          </label>
        </div>

        <p className="text-xs text-gray-500">
          To keep a pair at a fixed table for the whole event, mark them as
          stationary on the Tables step.
        </p>
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
          onClick={() => onConfirm({ tables, rounds, boardsPerRound })}
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Select Movement"}
        </button>
      </div>
    </>
  );
}
