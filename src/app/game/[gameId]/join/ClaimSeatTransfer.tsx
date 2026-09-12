"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { claimSeatTransfer } from "@/lib/game-service";
import { ClaimSeatTransferView } from "./ClaimSeatTransferView";

/**
 * "Move a seat to this device" affordance for the join screen. Opens a dialog
 * to enter a transfer code; on success the seat's secret has been rotated to
 * this device (invalidating the old one), so we route straight into the seat's
 * play screen.
 */
export function ClaimSeatTransfer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setCode("");
    setError(null);
    setLoading(false);
  }

  function handleClose() {
    if (loading) return;
    setOpen(false);
    reset();
  }

  function handleSubmit() {
    if (code.trim().length < 6) return;
    setError(null);
    setLoading(true);

    claimSeatTransfer(code.trim().toUpperCase())
      .then(({ gameId, seat }) => {
        router.replace(`/game/${gameId}/play/${seat}`);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to move seat");
        setLoading(false);
      });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-semibold text-blue-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        Moving from another device? Enter a code
      </button>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={handleClose} className="relative z-50">
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
                <ClaimSeatTransferView
                  code={code}
                  error={error}
                  loading={loading}
                  onCodeChange={setCode}
                  onSubmit={handleSubmit}
                  onCancel={handleClose}
                />
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
