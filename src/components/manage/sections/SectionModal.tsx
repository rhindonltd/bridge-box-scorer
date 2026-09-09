"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";

import TextField from "@/components/common/TextField";
import Button from "@/components/common/Button";

/** Result of confirming the modal. */
export interface SectionModalResult {
  /** Label for the section being added. */
  newLabel: string;
  /**
   * Label for the pre-existing section. Only present in two-field mode (the
   * first add, going from one section to two).
   */
  existingLabel?: string;
}

interface Props {
  open: boolean;
  /**
   * Two-field mode: the first add (1 → 2 sections) also names the existing
   * section. When provided, its `letter`/`label` prefill the first field.
   */
  existingSection?: { letter: string; label: string };
  /** The new section's letter, used to prefill and label the new-name field. */
  newSectionLetter: string;
  onConfirm: (result: SectionModalResult) => void;
  onCancel: () => void;
}

/**
 * Add-section naming modal. In its simple form it collects a label for the new
 * section. On the very first add (going from one section to two) it also
 * collects a label for the existing section, since a single-section game never
 * had a meaningful section name before.
 *
 * Presentational: it owns only its field state and emits the entered labels on
 * confirm; the caller performs the create/rename.
 */
export function SectionModal({
  open,
  existingSection,
  newSectionLetter,
  onConfirm,
  onCancel,
}: Props) {
  const twoField = existingSection != null;
  const [existingLabel, setExistingLabel] = useState(
    existingSection?.label ?? "",
  );
  const [newLabel, setNewLabel] = useState(newSectionLetter);

  // Re-seed the fields whenever the modal (re)opens for a different add.
  const [seedKey, setSeedKey] = useState<string | null>(null);
  const key = `${open}:${existingSection?.letter ?? ""}:${newSectionLetter}`;
  if (open && seedKey !== key) {
    setExistingLabel(existingSection?.label ?? "");
    setNewLabel(newSectionLetter);
    setSeedKey(key);
  }
  if (!open && seedKey !== null) {
    setSeedKey(null);
  }

  const canConfirm =
    newLabel.trim().length > 0 && (!twoField || existingLabel.trim().length > 0);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm({
      newLabel: newLabel.trim(),
      ...(twoField ? { existingLabel: existingLabel.trim() } : {}),
    });
  }

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
            <Dialog.Panel className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <Dialog.Title className="text-lg font-semibold text-gray-900">
                Add section
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-600">
                {twoField
                  ? "Name your existing section and the new one you're adding."
                  : "Give the new section a name."}
              </Dialog.Description>

              <div className="mt-4 flex flex-col gap-4">
                {twoField && (
                  <TextField
                    label={`Existing section (${existingSection.letter})`}
                    value={existingLabel}
                    onChange={setExistingLabel}
                  />
                )}
                <TextField
                  label={`New section (${newSectionLetter})`}
                  value={newLabel}
                  onChange={setNewLabel}
                />
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  value="Cancel"
                  onClick={onCancel}
                  bgColour="bg-gray-100"
                  textColour="text-gray-900"
                  hoverColour="hover:bg-gray-200"
                />
                <Button
                  value="Add"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                />
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
