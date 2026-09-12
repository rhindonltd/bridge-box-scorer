"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Smartphone } from "lucide-react";
import { ChangeDeviceView } from "./ChangeDeviceView";

interface Props {
  gameId: string;
  /** The seat this device holds (section-qualified, e.g. "A3NS"). */
  seat: string;
  /**
   * Render style. "button" (default) is a standalone button for the waiting
   * screen; "menuitem" is a compact header affordance for the live play page.
   */
  variant?: "button" | "icon";
}

/**
 * "Change device" trigger. Opens a dialog that shows a single-use transfer code
 * for this seat (see ChangeDeviceView). Available any time — before start (from
 * the waiting screen) and during play (from the play header) — so a player can
 * hand their seat to another device, e.g. a battery swap.
 */
export function ChangeDeviceButton({
  gameId,
  seat,
  variant = "button",
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          aria-label="Change device"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Smartphone size={20} />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-xl border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Change device
        </button>
      )}

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-50">
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
                <Dialog.Title className="mb-4 text-lg font-semibold text-gray-900">
                  Change device
                </Dialog.Title>

                {/* Re-mount per open so a fresh code is minted each time. */}
                {open && (
                  <ChangeDeviceView key={seat} gameId={gameId} seat={seat} />
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="mt-6 w-full rounded-xl bg-gray-100 py-3 text-base font-semibold text-gray-900 transition hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Done
                </button>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
