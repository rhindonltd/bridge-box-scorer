"use client";

import { useState, type ReactNode } from "react";

import { useSectionSelection } from "@/hooks/section-selection";
import { nextSectionLetter } from "@/model/section-letter";
import { createSection, renameSection } from "@/lib/section-service";
import { ClientSection } from "@/hooks/sections";
import { SectionPills } from "./SectionPills";
import { SectionModal, SectionModalResult } from "./SectionModal";

/** Table count a newly added section starts with. */
const DEFAULT_SECTION_TABLES = 5;

function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : "Something went wrong");
}

/**
 * Shared section UX for the setup pages (Tables, Movement, Timer). Owns the
 * per-page selection, renders the section pills (with a "+ Add section" pill),
 * and drives the add-section modal.
 *
 * Add behaviour:
 * - First add (1 → 2 sections): the modal collects a name for the existing
 *   section and the new one, then renames the existing section and creates the
 *   new one.
 * - Subsequent adds: the modal collects just the new section's name.
 *
 * The current selection is preserved across an add so the director stays where
 * they were; the new section simply appears as a pill.
 */
export function useSetupSections(gameId: string): {
  sections: ClientSection[];
  selected: string | null;
  setSelected: (section: string) => void;
  /** The pills + Add-section affordance, ready to render. */
  pills: ReactNode;
  /** The add-section modal, ready to render (renders nothing when closed). */
  modal: ReactNode;
} {
  const { sections, selected, setSelected } = useSectionSelection(gameId);
  const [modalOpen, setModalOpen] = useState(false);

  const existingLetters = sections.map((s) => s.section);
  const newLetter = nextSectionLetter(existingLetters);

  // The first add (going from a single section to two) also names the existing
  // section, which never had a meaningful label before.
  const firstAdd = sections.length === 1;
  const existingSection = firstAdd
    ? { letter: sections[0].section, label: sections[0].label }
    : undefined;

  async function handleConfirm(result: SectionModalResult) {
    setModalOpen(false);
    try {
      if (result.existingLabel != null && existingSection) {
        await renameSection(gameId, existingSection.letter, result.existingLabel);
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
      onAddSection={() => setModalOpen(true)}
    />
  );

  const modal = (
    <SectionModal
      open={modalOpen}
      existingSection={existingSection}
      newSectionLetter={newLetter}
      onConfirm={handleConfirm}
      onCancel={() => setModalOpen(false)}
    />
  );

  return { sections, selected, setSelected, pills, modal };
}
