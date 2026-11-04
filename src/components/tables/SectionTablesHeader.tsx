"use client";

import { useId, useState } from "react";
import { StepperInput } from "@/components/common/StepperInput";

interface Props {
  /** The selected section's letter (e.g. "A"). */
  section: string;
  /** The section's current editable label. */
  label: string;
  /** The section's current table count. */
  tables: number;
  /**
   * Whether the game has more than one section. Only then are the per-section
   * concerns (rename, delete) meaningful; a single-section game shows just the
   * table count + stepper, exactly as before.
   */
  multiSection: boolean;
  /** Resize the section's table count. */
  onResize: (tables: number) => void;
  /** Commit a new (trimmed, changed) label for the section. */
  onRename: (label: string) => void;
  /** Delete the section. Only offered when `multiSection`. */
  onDelete: () => void;
  /**
   * Hide the structure-changing controls (table-count stepper, rename field,
   * delete action), showing the section name and table count as read-only text
   * instead. Used once the game has started: seating can still be managed, but
   * the structure (sections, table count) is fixed.
   */
  readOnly?: boolean;
}

/**
 * The grey header bar of the Tables screen's per-section card. For a
 * single-section game it is just the "{n} tables" count and the +/- stepper.
 * Once a game has more than one section it also carries that section's
 * management controls — an inline, editable label and a Delete action — folding
 * in what used to live on a separate "Manage sections" screen without crowding
 * the single-section view.
 */
export function SectionTablesHeader({
  section,
  label,
  tables,
  multiSection,
  onResize,
  onRename,
  onDelete,
  readOnly = false,
}: Props) {
  const labelId = useId();
  const [draft, setDraft] = useState(label);

  // Re-seed the field when the selected section (or its canonical label)
  // changes underneath us — switching sections via the pills, or a live rename
  // broadcast from another device. Done as a render-time reset keyed on the
  // section+label (the React "adjust state on prop change" pattern) rather than
  // an effect, so the field never renders a stale value for a frame.
  const [seed, setSeed] = useState(`${section}:${label}`);
  const key = `${section}:${label}`;
  if (seed !== key) {
    setSeed(key);
    setDraft(label);
  }

  function commitLabel() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== label) {
      onRename(trimmed);
    } else {
      // Reset to the canonical label if cleared or unchanged.
      setDraft(label);
    }
  }

  return (
    <div className="flex flex-col border-b border-gray-200">
      {multiSection && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-200 px-4 py-3">
          {/* "Section" label + an inline editable box holding the section's
              name (defaults to its letter, e.g. "A", but can be renamed to
              anything like "Red Room"), kept on one row with the Delete action
              rather than stacked. Read-only once the game has started: the name
              shows as static text and Delete is withheld. */}
          <div className="flex items-center gap-2">
            <label
              htmlFor={readOnly ? undefined : labelId}
              className="text-sm font-semibold text-gray-700"
            >
              Section
            </label>
            {readOnly ? (
              <span className="text-base font-semibold text-gray-900">
                {label}
              </span>
            ) : (
              <input
                id={labelId}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitLabel}
                aria-label="Section label"
                placeholder="Section label"
                className="w-28 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-base focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          </div>
          {!readOnly && (
            <button
              type="button"
              onClick={onDelete}
              className="text-sm font-medium text-red-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
            >
              Delete section
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 bg-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600">
          {tables} {tables === 1 ? "table" : "tables"}
        </h2>
        {!readOnly && (
          <div className="w-32">
            <StepperInput
              label="Tables"
              min={2}
              value={tables}
              onChange={onResize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
