"use client";

import { useState } from "react";
import { useSections } from "@/hooks/sections";
import { SectionManager } from "./SectionManager";
import { SectionMovementPicker } from "./SectionMovementPicker";
import {
  createSection,
  renameSection,
  deleteSection,
  updateSectionTables,
} from "@/lib/section-service";

interface Props {
  gameId: string;
  /** Disable editing once the game is running. */
  readOnly?: boolean;
}

/** The next unused section letter (A, B, C, ...). */
function nextSectionLetter(existing: string[]): string {
  const used = new Set(existing);
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  // Extremely unlikely for a bridge session; fall back to a numbered suffix.
  return `Z${existing.length}`;
}

function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : "Something went wrong");
}

/**
 * Wires the SectionManager UI to the live sections list and the section socket
 * service. Adding/renaming/resizing/deleting and per-section movement selection
 * all revalidate through the sections SWR key (via useSections).
 */
export function SectionManagerContainer({ gameId, readOnly = false }: Props) {
  const { sections } = useSections(gameId);
  const [pickingFor, setPickingFor] = useState<string | null>(null);

  const pickingSection = sections.find((s) => s.section === pickingFor);

  if (pickingFor && pickingSection) {
    return (
      <SectionMovementPicker
        gameId={gameId}
        section={pickingSection.section}
        tables={pickingSection.tables}
        onDone={() => setPickingFor(null)}
      />
    );
  }

  return (
    <SectionManager
      sections={sections}
      readOnly={readOnly}
      onAddSection={async () => {
        const letter = nextSectionLetter(sections.map((s) => s.section));
        try {
          await createSection(gameId, letter, 1);
        } catch (err) {
          reportError(err);
        }
      }}
      onRenameSection={async (section, label) => {
        try {
          await renameSection(gameId, section, label);
        } catch (err) {
          reportError(err);
        }
      }}
      onResizeSection={async (section, tables) => {
        try {
          await updateSectionTables(gameId, section, tables);
        } catch (err) {
          reportError(err);
        }
      }}
      onDeleteSection={async (section) => {
        if (!confirm(`Delete section ${section}?`)) return;
        try {
          await deleteSection(gameId, section);
        } catch (err) {
          reportError(err);
        }
      }}
      onSelectMovement={(section) => setPickingFor(section)}
    />
  );
}
