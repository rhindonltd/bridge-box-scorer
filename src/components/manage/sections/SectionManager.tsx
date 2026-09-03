"use client";

import { useState } from "react";
import Button from "@/components/common/Button";
import TextField from "@/components/common/TextField";
import { ClientSection } from "@/hooks/sections";

export interface SectionManagerProps {
  sections: ClientSection[];
  /** Add a new section with the next free letter. */
  onAddSection: () => void;
  onRenameSection: (section: string, label: string) => void;
  onDeleteSection: (section: string) => void;
  /** Open the per-section movement picker. */
  onSelectMovement: (section: string) => void;
  /** Disable editing once the game is running. */
  readOnly?: boolean;
}

function movementSummary(section: ClientSection): string {
  const m = section.selectedMovement;
  if (!m) return "No movement selected";
  if (m.source === "MITCHELL") {
    return `Mitchell — ${m.mitchell.tables} tables, ${m.mitchell.rounds} rounds`;
  }
  return "Movement selected";
}

/**
 * Director-facing section list. Each section shows its label (editable), a
 * display-only table count, movement summary + picker, and a delete control.
 * A footer button adds a new section. Table counts are adjusted from the
 * Tables view, not here.
 */
export function SectionManager({
  sections,
  onAddSection,
  onRenameSection,
  onDeleteSection,
  onSelectMovement,
  readOnly = false,
}: SectionManagerProps) {
  const multiSection = sections.length > 1;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4">
      <ul className="flex flex-col gap-4">
        {sections.map((s) => (
          <li
            key={s.section}
            className={
              multiSection
                ? "rounded-xl border border-gray-200 p-4 flex flex-col gap-3"
                : "flex flex-col gap-3"
            }
          >
            <SectionRow
              section={s}
              readOnly={readOnly}
              multiSection={multiSection}
              onRename={(label) => onRenameSection(s.section, label)}
              onDelete={() => onDeleteSection(s.section)}
              onSelectMovement={() => onSelectMovement(s.section)}
              canDelete={sections.length > 1}
            />
          </li>
        ))}
      </ul>

      {!readOnly && (
        // Wrap in a shrink-0 flex row: the shared Button has `flex-1`, which
        // would otherwise stretch to fill the column's leftover height.
        <div className="flex shrink-0">
          <Button
            value="Add Section"
            onClick={onAddSection}
            bgColour="bg-gray-100"
            textColour="text-gray-900"
            hoverColour="hover:bg-gray-200"
          />
        </div>
      )}
    </div>
  );
}

function SectionRow({
  section,
  readOnly,
  canDelete,
  multiSection,
  onRename,
  onDelete,
  onSelectMovement,
}: {
  section: ClientSection;
  readOnly: boolean;
  canDelete: boolean;
  /**
   * Whether the game has more than one section. In a single-section game there
   * is no meaningful section distinction, so the "Section X" heading and the
   * per-section label editor are hidden; only the movement controls remain
   * (plus the parent's "Add Section" button to go multi-section).
   */
  multiSection: boolean;
  onRename: (label: string) => void;
  onDelete: () => void;
  onSelectMovement: () => void;
}) {
  const [label, setLabel] = useState(section.label);

  function commitLabel() {
    const trimmed = label.trim();
    if (trimmed && trimmed !== section.label) {
      onRename(trimmed);
    } else {
      // Reset to the canonical label if cleared / unchanged.
      setLabel(section.label);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {multiSection && (
        <>
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-bold" aria-label="Section letter">
              Section {section.section}
            </div>
            {!readOnly && canDelete && (
              <button
                type="button"
                className="text-sm text-red-700 hover:underline"
                onClick={onDelete}
              >
                Delete
              </button>
            )}
          </div>

          {!readOnly ? (
            <div onBlur={commitLabel}>
              <TextField label="Label" value={label} onChange={setLabel} />
            </div>
          ) : (
            <div className="text-gray-700">{section.label}</div>
          )}
        </>
      )}

      {/* Table count is display-only here; adjust it from the Tables view. */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-600">Tables</span>
        <span className="text-lg font-bold">{section.tables}</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-600">{movementSummary(section)}</span>
        {!readOnly && (
          <Button
            value={section.selectedMovement ? "Change Movement" : "Set Movement"}
            onClick={onSelectMovement}
            bgColour="bg-gray-100"
            textColour="text-gray-900"
            hoverColour="hover:bg-gray-200"
            className="max-w-[180px]"
          />
        )}
      </div>
    </div>
  );
}
