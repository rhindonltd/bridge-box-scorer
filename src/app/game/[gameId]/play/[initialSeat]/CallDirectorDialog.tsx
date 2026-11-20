"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

import type { CallDirectorState } from "@/hooks/call-director";
import { describeTable } from "@/model/director-alert";

interface Props {
  state: CallDirectorState;
  onConfirm: () => void;
  onClose: () => void;
}

const primaryButton =
  "mt-6 w-full rounded-xl bg-blue-600 py-3 text-base font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-60";
const secondaryButton =
  "mt-3 w-full rounded-xl bg-gray-100 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/**
 * The player's "Call Director" dialog. Presentational: the steps live in
 * {@link useCallDirector}. Confirm → "Director called" (naming the table and
 * how many times the pair has called) → "The director is on the way" once a
 * director has dismissed the popup.
 */
export function CallDirectorDialog({ state, onConfirm, onClose }: Props) {
  const open = state.step !== "closed";
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
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
          <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            {(state.step === "confirm" || state.step === "sending") && (
              <>
                <Dialog.Title className="mb-2 text-lg font-semibold text-gray-900">
                  Call the director?
                </Dialog.Title>
                <p className="text-sm text-gray-600">
                  The director will be asked to come to your table.
                </p>
                <button
                  type="button"
                  onClick={onConfirm}
                  disabled={state.step === "sending"}
                  className={primaryButton}
                >
                  {state.step === "sending" ? "Calling…" : "Call Director"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className={secondaryButton}
                >
                  Cancel
                </button>
              </>
            )}

            {state.step === "called" && (
              <>
                <Dialog.Title className="mb-2 text-lg font-semibold text-gray-900">
                  Director called
                </Dialog.Title>
                <p className="text-sm text-gray-600">
                  The director has been asked to come to{" "}
                  {describeTable(state.table)}.
                  {state.calls > 1 && ` You have called ${state.calls} times.`}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className={primaryButton}
                >
                  OK
                </button>
              </>
            )}

            {state.step === "answered" && (
              <>
                <Dialog.Title className="mb-2 text-lg font-semibold text-gray-900">
                  The director is on the way
                </Dialog.Title>
                <p className="text-sm text-gray-600">
                  Please stay at your table.
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className={primaryButton}
                >
                  OK
                </button>
              </>
            )}

            {state.step === "error" && (
              <>
                <Dialog.Title className="mb-2 text-lg font-semibold text-gray-900">
                  Could not call the director
                </Dialog.Title>
                <p role="alert" className="text-sm text-red-700">
                  {state.message}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className={primaryButton}
                >
                  OK
                </button>
              </>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}
