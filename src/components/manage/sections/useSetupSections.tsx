"use client";

import { useState, type ReactNode } from "react";

import { useSectionSelection } from "@/hooks/section-selection";
import { nextSectionLetter } from "@/model/section-letter";
import {
  createSection,
  renameSection,
  splitSection,
} from "@/lib/section-service";
import { ClientSection } from "@/hooks/sections";
import { SectionPills } from "./SectionPills";
import { SectionModal, SectionModalResult } from "./SectionModal";

import { reportError } from "@/lib/report-error";

/** Table count a newly added section starts with. */
const DEFAULT_SECTION_TABLES = 5;

/**
 * Shared section UX for the setup pages (Tables, Movement, Timer). Owns the
 * per-page selection, renders the section pills (with a "+ Add section" pill),
 * and drives the add-section modal.
 *
 * The modal offers two ways to create a section:
 * - Add: a brand-new empty section (default table count). On the first add
 *   (1 → 2 sections) it also names the previously-unnamed existing section.
 * - Split: divide an existing section's tables (and the pairs seated at them)
 *   into two, choosing how many tables go to each side.
 *
 * The current selection is preserved across the change so the director stays
 * where they were; the new section simply appears as a pill.
 */
export function useSetupSections(
  gameId: string,
  options?: {
    /**
     * Whether the director may add sections. Defaults to true. A Swiss event is
     * a single pool drawn round by round, so it is single-section only — the
     * Swiss setup pages pass false to hide the "+ Add section" affordance.
     */
    allowAddSection?: boolean;
  },
): {
  sections: ClientSection[];
  selected: string | null;
  setSelected: (section: string) => void;
  /** The pills + Add-section affordance, ready to render. */
  pills: ReactNode;
  /** The add-section modal, ready to render (renders nothing when closed). */
  modal: ReactNode;
} {
  const allowAddSection = options?.allowAddSection ?? true;
  const { sections, selected, setSelected } = useSectionSelection(gameId);
  const [modalOpen, setModalOpen] = useState(false);

  const existingLetters = sections.map((s) => s.section);
  const newLetter = nextSectionLetter(existingLetters);

  // The modal acts on the full section list: Split needs each section's table
  // count, and the first-add case still names the previously-unnamed section.
  const modalSections = sections.map((s) => ({
    letter: s.section,
    label: s.label,
    tables: s.tables,
  }));

  async function handleConfirm(result: SectionModalResult) {
    setModalOpen(false);
    try {
      if (result.mode === "split") {
        await splitSection(gameId, {
          from: result.from,
          newSection: newLetter,
          tablesToNewSection: result.tablesToNewSection,
          newLabel: result.newLabel,
          fromLabel: result.fromLabel,
        });
        return;
      }

      // Add mode. On the first add (1 → 2 sections) the modal also collects a
      // label for the previously-unnamed existing section.
      if (result.existingLabel != null && sections.length === 1) {
        await renameSection(gameId, sections[0].section, result.existingLabel);
      }
      await createSection(
        gameId,
        newLetter,
        DEFAULT_SECTION_TABLES,
        result.newLabel,
      );
    } catch (err) {
      reportError(err);
    }
  }

  const pills = (
    <SectionPills
      sections={sections}
      selected={selected ?? ""}
      onSelect={setSelected}
      // Swiss events are single-section, so the add affordance is withheld.
      onAddSection={allowAddSection ? () => setModalOpen(true) : undefined}
    />
  );

  const modal = (
    <SectionModal
      open={modalOpen}
      sections={modalSections}
      newSectionLetter={newLetter}
      onConfirm={handleConfirm}
      onCancel={() => setModalOpen(false)}
    />
  );

  return { sections, selected, setSelected, pills, modal };
}
