"use client";

import { useState } from "react";

import { useSections } from "@/hooks/sections";
import { nextSectionLetter } from "@/model/section-letter";
import {
  createSection,
  renameSection,
  deleteSection,
} from "@/lib/section-service";
import { SectionManager } from "./SectionManager";
import { SectionModal, SectionModalResult } from "./SectionModal";

/** Table count a newly added section starts with. */
const DEFAULT_SECTION_TABLES = 5;

interface Props {
  gameId: string;
}

function reportError(err: unknown) {
  alert(err instanceof Error ? err.message : "Something went wrong");
}

/**
 * The setup flow's "Manage sections" screen: rename and delete sections, and
 * add new ones. Movement selection lives on the Movement step, so the section
 * list here shows no movement summary/picker.
 *
 * Adding uses the shared modal so the first add (1 → 2 sections) names both the
 * existing and new section, matching the pills' add affordance elsewhere.
 */
export function ManageSectionsScreen({ gameId }: Props) {
  const { sections } = useSections(gameId);
  const [modalOpen, setModalOpen] = useState(false);

  const newLetter = nextSectionLetter(sections.map((s) => s.section));
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

  return (
    <>
      <SectionManager
        sections={sections}
        showMovement={false}
        onAddSection={() => setModalOpen(true)}
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
      />
      <SectionModal
        open={modalOpen}
        existingSection={existingSection}
        newSectionLetter={newLetter}
        onConfirm={handleConfirm}
        onCancel={() => setModalOpen(false)}
      />
    </>
  );
}
