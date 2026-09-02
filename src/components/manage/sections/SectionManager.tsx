"use client";

import { useState } from "react";
import Button from "@/components/common/Button";
import NumberStepper from "@/components/common/NumberStepper";
import TextField from "@/components/common/TextField";
import { ClientSection } from "@/hooks/sections";

export interface SectionManagerProps {
  sections: ClientSection[];
  /** Add a new section with the next free letter. */
  onAddSection: () => void;
  onRenameSection: (section: string, label: string) => void;
  onResizeSection: (section: string, tables: number) => void;
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
 * Director-facing section list. Each section shows its label (editable), table
 * count (NumberStepper), movement summary + picker, and a delete control. A
 * footer button adds a new section.
 */
export function SectionManager({
  sections,
  onAddSection,
  onRenameSection,
  onResizeSection,
  onDeleteSection,
  onSelectMovement,
  readOnly = false,
}: SectionManagerProps) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <ul className="flex flex-col gap-4">
        {sections.map((s) => (
          <li
            key={s.section}
            className="rounded-xl border border-gray-200 p-4 flex flex-col gap-3"
          >
            <SectionRow
              section={s}
              readOnly={readOnly}
              onRename={(label) => onRenameSection(s.section, label)}
              onResize={(tables) => onResizeSection(s.section, tables)}
              onDelete={() => onDeleteSection(s.section)}
              onSelectMovement={() => onSelectMovement(s.section)}
              canDelete={sections.length > 1}
            />
          </li>
        ))}
      </ul>

      {!readOnly && (
        <Button
          value="Add Section"
          onClick={onAddSection}
          bgColour="bg-gray-100"
          textColour="text-gray-900"
          hoverColour="hover:bg-gray-200"
        />
      )}
    </div>
  );
}

function SectionRow({
  section,
  readOnly,
  canDelete,
  onRename,
  onResize,
  onDelete,
  onSelectMovement,
}: {
  section: ClientSection;
  readOnly: boolean;
  canDelete: boolean;
  onRename: (label: string) => void;
  onResize: (tables: number) => void;
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

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-gray-600">Tables</span>
        {readOnly ? (
          <span className="text-lg font-bold">{section.tables}</span>
        ) : (
          <NumberStepper value={section.tables} min={1} onChange={onResize} />
        )}
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
