"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";

import TextField from "@/components/common/TextField";
import SelectField from "@/components/common/SelectField";
import Button from "@/components/common/Button";
import { StepperInput } from "@/components/common/StepperInput";
import { PillToggle } from "@/components/common/PillToggle";
import { MIN_SECTION_TABLES, canSplitSection } from "@/model/section";

/** A section the modal can act on. */
export interface SectionModalSection {
  letter: string;
  label: string;
  tables: number;
}

/** Result of confirming the modal. A discriminated union over the two modes. */
export type SectionModalResult =
  | {
      /** Add a brand-new (empty) section alongside the existing ones. */
      mode: "add";
      /** Label for the section being added. */
      newLabel: string;
      /**
       * Label for the pre-existing section. Only present on the first add
       * (1 → 2 sections), which also names the previously-unnamed section.
       */
      existingLabel?: string;
    }
  | {
      /** Split an existing section into two. */
      mode: "split";
      /** The section being split (its letter). */
      from: string;
      /** How many of the source's tables move into the new section. */
      tablesToNewSection: number;
      /** Label for the new section. */
      newLabel: string;
      /** Label (re)applied to the source section. */
      fromLabel: string;
    };

interface Props {
  open: boolean;
  /** Every current section, so Split can target one and show table counts. */
  sections: SectionModalSection[];
  /** The new section's letter, used to prefill/label the new-name field. */
  newSectionLetter: string;
  onConfirm: (result: SectionModalResult) => void;
  onCancel: () => void;
}

type Mode = "add" | "split";

/* v8 ignore next -- unreachable singular: both sides of a split always keep MIN_SECTION_TABLES (2) or more tables, so the count is never 1 */
const tablesNoun = (n: number) => (n === 1 ? "table" : "tables");

/**
 * Add/Split-section modal. A director adding a section chooses between:
 *
 *  - Add: a brand-new empty section alongside the existing ones (the new
 *    section gets a default table count server-side).
 *  - Split: divide an existing section's tables (and the pairs seated at them)
 *    into two, choosing how many tables go to each side.
 *
 * Splitting is only offered when some section has at least 2 tables (you cannot
 * split a single-table section). A single-section game defaults to Split, since
 * "split into sections" is the natural first move and also names the two
 * resulting sections; a multi-section game defaults to Add.
 *
 * Presentational: it owns only its field state and emits the chosen
 * {@link SectionModalResult}; the caller performs the create/split.
 */
export function SectionModal({
  open,
  sections,
  newSectionLetter,
  onConfirm,
  onCancel,
}: Props) {
  const splittable = sections.filter((s) => canSplitSection(s.tables));
  const canSplit = splittable.length > 0;
  const firstSplit = sections.length === 1;

  // Default: a single-section game splits (naming both sides); otherwise add.
  const defaultMode: Mode = firstSplit && canSplit ? "split" : "add";

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [newLabel, setNewLabel] = useState(newSectionLetter);
  // Add-mode first-add rename of the existing (single) section.
  const [existingLabel, setExistingLabel] = useState(
    firstSplit ? sections[0].label : "",
  );
  // Split-mode state.
  const [splitFrom, setSplitFrom] = useState(splittable[0]?.letter ?? "");
  const [fromLabel, setFromLabel] = useState(
    splittable[0]?.label ?? "",
  );
  const [tablesToNew, setTablesToNew] = useState(MIN_SECTION_TABLES);

  // Re-seed all fields whenever the modal (re)opens for a different add/split,
  // using the render-time reset pattern (keyed on the inputs) so the fields
  // never show a stale value for a frame.
  const key = `${open}:${newSectionLetter}:${sections
    .map((s) => `${s.letter}${s.tables}`)
    .join(",")}`;
  const [seedKey, setSeedKey] = useState<string | null>(null);
  if (open && seedKey !== key) {
    setSeedKey(key);
    setMode(defaultMode);
    setNewLabel(newSectionLetter);
    setExistingLabel(firstSplit ? sections[0].label : "");
    const firstSplittable = splittable[0];
    setSplitFrom(firstSplittable?.letter ?? "");
    setFromLabel(firstSplittable?.label ?? "");
    setTablesToNew(MIN_SECTION_TABLES);
  }
  if (!open && seedKey !== null) {
    setSeedKey(null);
  }

  const source = splittable.find((s) => s.letter === splitFrom);
  const twoFieldAdd = mode === "add" && firstSplit;

  const canConfirm =
    newLabel.trim().length > 0 &&
    (mode === "add"
      ? !twoFieldAdd || existingLabel.trim().length > 0
      : source != null &&
        fromLabel.trim().length > 0 &&
        tablesToNew >= MIN_SECTION_TABLES &&
        tablesToNew <= source.tables - MIN_SECTION_TABLES);

  function handleConfirm() {
    /* v8 ignore next -- defensive: the confirm button is disabled while
       !canConfirm, so a disabled native button never fires this handler. */
    if (!canConfirm) return;

    if (mode === "add") {
      onConfirm({
        mode: "add",
        newLabel: newLabel.trim(),
        ...(twoFieldAdd ? { existingLabel: existingLabel.trim() } : {}),
      });
      return;
    }

    /* v8 ignore next -- source is non-null whenever canConfirm is true in split
       mode, so this guard is unreachable through the UI. */
    if (!source) return;
    onConfirm({
      mode: "split",
      from: source.letter,
      tablesToNewSection: tablesToNew,
      newLabel: newLabel.trim(),
      fromLabel: fromLabel.trim(),
    });
  }

  const confirmLabel = mode === "add" ? "Add" : "Split";

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
                {firstSplit ? "Split into sections" : "Add a section"}
              </Dialog.Title>

              <div className="mt-4 flex flex-col gap-4">
                {/* Mode selector — shown whenever a split is possible (some
                    section has 2+ tables), so the director can always choose
                    between adding a new section and splitting an existing one.
                    With nothing to split, only the Add fields show. */}
                {canSplit && (
                  <PillToggle<Mode>
                    name="section-modal-mode"
                    legend="Add or split a section"
                    options={[
                      { value: "add", label: "Add new" },
                      { value: "split", label: "Split existing" },
                    ]}
                    value={mode}
                    onChange={setMode}
                  />
                )}

                {mode === "add" ? (
                  <>
                    <Dialog.Description className="text-sm text-gray-600">
                      {twoFieldAdd
                        ? "Name your existing section and the new one you're adding."
                        : "Add a new, empty section. Give it a name."}
                    </Dialog.Description>
                    {twoFieldAdd && (
                      <TextField
                        label={`Existing section (${sections[0].letter})`}
                        value={existingLabel}
                        onChange={setExistingLabel}
                      />
                    )}
                    <TextField
                      label={`New section (${newSectionLetter})`}
                      value={newLabel}
                      onChange={setNewLabel}
                    />
                  </>
                ) : (
                  <>
                    <Dialog.Description className="text-sm text-gray-600">
                      Divide a section&rsquo;s tables into two. The pairs already
                      seated at the moved tables come across to the new section.
                    </Dialog.Description>

                    {/* Which section to split — a dropdown only when more than
                        one section can be split; otherwise it is fixed. */}
                    {splittable.length > 1 ? (
                      <SelectField
                        label="Section to split"
                        value={splitFrom}
                        options={splittable.map((s) => ({
                          label:
                            s.letter === s.label
                              ? `Section ${s.letter}`
                              : `Section ${s.letter} — ${s.label}`,
                          value: s.letter,
                        }))}
                        onSelect={(letter) => {
                          setSplitFrom(letter);
                          const picked = splittable.find(
                            (s) => s.letter === letter,
                          );
                          /* v8 ignore next -- unreachable: the picker only offers letters from `splittable`, so `picked` is always found */
                          setFromLabel(picked?.label ?? "");
                          setTablesToNew(MIN_SECTION_TABLES);
                        }}
                      />
                    ) : (
                      source && (
                        <p className="text-sm text-gray-700">
                          Splitting{" "}
                          <span className="font-semibold">
                            Section {source.letter}
                          </span>{" "}
                          ({source.tables} tables).
                        </p>
                      )
                    )}

                    {source && (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <label
                            htmlFor="split-tables-to-new"
                            className="text-sm font-semibold text-gray-700"
                          >
                            Tables in {newSectionLetter}
                          </label>
                          <div className="w-32">
                            <StepperInput
                              id="split-tables-to-new"
                              label="Tables in new section"
                              min={MIN_SECTION_TABLES}
                              max={source.tables - MIN_SECTION_TABLES}
                              value={tablesToNew}
                              onChange={setTablesToNew}
                            />
                          </div>
                        </div>

                        <p className="text-sm text-gray-600" aria-live="polite">
                          Section {source.letter}:{" "}
                          <span className="font-semibold">
                            {source.tables - tablesToNew}
                          </span>{" "}
                          {tablesNoun(source.tables - tablesToNew)}
                          {" · "}
                          Section {newSectionLetter}:{" "}
                          <span className="font-semibold">{tablesToNew}</span>{" "}
                          {tablesNoun(tablesToNew)}
                        </p>

                        <TextField
                          label={`Section ${source.letter} name`}
                          value={fromLabel}
                          onChange={setFromLabel}
                        />
                        <TextField
                          label={`New section (${newSectionLetter}) name`}
                          value={newLabel}
                          onChange={setNewLabel}
                        />
                      </>
                    )}
                  </>
                )}
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
                  value={confirmLabel}
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
