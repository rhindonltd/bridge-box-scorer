"use client";

import { useState } from "react";
import { useSections } from "@/hooks/sections";
import { SectionManager } from "./SectionManager";
import { SectionMovementPicker } from "./SectionMovementPicker";
import {
  createSection,
  renameSection,
  deleteSection,
} from "@/lib/section-service";

/** Table count a newly added section starts with. */
const DEFAULT_SECTION_TABLES = 5;

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

  async function handleAddSection() {
    const letter = nextSectionLetter(sections.map((s) => s.section));
    try {
      await createSection(gameId, letter, DEFAULT_SECTION_TABLES);
    } catch (err) {
      reportError(err);
    }
  }

  const pickingSection = sections.find((s) => s.section === pickingFor);

  if (pickingFor && pickingSection) {
    return (
      <SectionMovementPicker
        gameId={gameId}
        section={pickingSection.section}
        tables={pickingSection.tables}
        multiSection={sections.length > 1}
        onDone={() => setPickingFor(null)}
      />
    );
  }

  // Single-section games have no meaningful section distinction: skip the
  // sections list and drop the director straight onto the movement picker.
  // "Add Section" there converts the event to multi-section, which (because
  // sections.length becomes > 1) reveals the full SectionManager list. In
  // read-only mode (a running game) we keep the list so nothing is editable.
  const singleSection = sections[0];
  if (!readOnly && sections.length === 1 && singleSection) {
    return (
      <SectionMovementPicker
        gameId={gameId}
        section={singleSection.section}
        tables={singleSection.tables}
        multiSection={false}
        onAddSection={handleAddSection}
      />
    );
  }

  return (
    <SectionManager
      sections={sections}
      readOnly={readOnly}
      onAddSection={handleAddSection}
      onRenameSection={async (section, label) => {
        try {
          await renameSection(gameId, section, label);
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
