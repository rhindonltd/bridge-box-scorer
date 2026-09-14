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
   * Render style for the built-in trigger:
   * - "button" (default): a standalone full-width button for the waiting screen.
   * - "icon": a compact icon affordance.
   * - "none": render no trigger at all — only the dialog. Use with the
   *   controlled `open`/`onOpenChange` props when something else (e.g. a header
   *   menu item) opens the dialog.
   */
  variant?: "button" | "icon" | "none";
  /**
   * Controlled open state. When provided, the dialog's visibility is driven by
   * the parent and `onOpenChange` is called on open/close; when omitted, the
   * component manages its own open state (uncontrolled).
   */
  open?: boolean;
  /** Notified when the dialog wants to open (true) or close (false). */
  onOpenChange?: (open: boolean) => void;
}

/**
 * "Change device" trigger. Opens a dialog that shows a single-use transfer code
 * for this seat (see ChangeDeviceView). Available any time — before start (from
 * the waiting screen) and during play (from the play header) — so a player can
 * hand their seat to another device, e.g. a battery swap.
 *
 * Can be used uncontrolled (renders its own button/icon trigger and manages
 * open state) or controlled (parent supplies `open`/`onOpenChange`, typically
 * with `variant="none"` so the parent's own control opens it).
 */
export function ChangeDeviceButton({
  gameId,
  seat,
  variant = "button",
  open: openProp,
  onOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false);

  // Controlled when an `open` prop is supplied; otherwise fall back to internal
  // state so existing callers keep working unchanged.
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const setOpen = (next: boolean) => {
    if (!isControlled) {
      setInternalOpen(next);
    }
    onOpenChange?.(next);
  };

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
      ) : variant === "none" ? null : (
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
