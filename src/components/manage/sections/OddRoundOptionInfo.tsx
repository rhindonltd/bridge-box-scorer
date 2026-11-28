"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Info } from "lucide-react";
import Button from "@/components/common/Button";

/**
 * A column heading in the Swiss odd-field plan table (e.g. "Bye", "Half
 * matches"), with an info button beside it. The button opens a dialog that
 * explains what choosing that option for a round means, so the table itself
 * stays compact.
 */
export function OddRoundOptionInfo({
  option,
  children,
}: {
  /** The option's name: the column heading and the dialog title. */
  option: string;
  /** The explanation shown in the dialog. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      <span className="inline-flex items-center gap-1">
        {option}
        <button
          type="button"
          aria-label={`What does ${option} mean?`}
          onClick={() => setOpen(true)}
          className="-m-1.5 rounded-full p-1.5 text-gray-500 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Info className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>

      <Transition show={open} as={Fragment}>
        <Dialog onClose={close} className="relative z-50">
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
                <Dialog.Title className="text-lg font-semibold text-gray-900">
                  {option}
                </Dialog.Title>
                <Dialog.Description
                  as="div"
                  className="mt-3 space-y-2 text-sm font-normal text-gray-700"
                >
                  {children}
                </Dialog.Description>
                <div className="mt-6">
                  <Button value="OK" onClick={close} />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
