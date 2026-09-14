"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

import type { SeatedPair } from "@/context/AssignmentContext";

/** Full side name shown in the dialog (matches the waiting-screen wording). */
const DIRECTION_LABEL: Record<"NS" | "EW", string> = {
  NS: "North–South",
  EW: "East–West",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** This seat's pair (its two players + side), or null while still loading. */
  pair: SeatedPair | null;
  /** The pair's number, shown when a movement has been selected. */
  pairId: string | null;
}

/**
 * Shows the seated pair's own details: their pair number (once a movement is
 * set), which side they play, and the two players' names with each player's
 * national/EBU number when one is on record. Presentational only — the pair
 * comes from {@link useAssignment}; this component just renders it.
 */
export function PairDetailsDialog({ open, onOpenChange, pair, pairId }: Props) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={() => onOpenChange(false)} className="relative z-50">
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
            <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <Dialog.Title className="mb-1 text-lg font-semibold text-gray-900">
                {pairId != null ? `Pair ${pairId}` : "Pair details"}
              </Dialog.Title>

              {pair ? (
                <>
                  <p className="mb-4 text-sm text-gray-600">
                    {DIRECTION_LABEL[pair.side]}
                  </p>

                  <ul className="flex flex-col gap-3">
                    {pair.players.map((player) => (
                      <li
                        key={player.id}
                        className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                      >
                        <div className="text-base font-semibold text-gray-900">
                          {player.firstName} {player.lastName}
                        </div>
                        {player.nationalId && (
                          <div className="text-sm text-gray-600">
                            No. {player.nationalId}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">
                  Loading pair details…
                </p>
              )}

              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="mt-6 w-full rounded-xl bg-gray-100 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                Done
              </button>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
