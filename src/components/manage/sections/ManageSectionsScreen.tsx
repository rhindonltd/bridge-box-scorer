"use client";

import { useId, useState } from "react";

import { useSections } from "@/hooks/sections";
import { useRequiredGame } from "@/context/GameContext";
import { nextSectionLetter } from "@/model/section-letter";
import {
  createSection,
  renameSection,
  deleteSection,
} from "@/lib/section-service";
import { updateCombinedRanking } from "@/lib/game-service";
import { Toggle } from "@/components/common/Toggle";
import { SectionManager } from "./SectionManager";
import { SectionModal, SectionModalResult } from "./SectionModal";
import { reportError } from "@/lib/report-error";

/** Table count a newly added section starts with. */
const DEFAULT_SECTION_TABLES = 5;

interface Props {
  gameId: string;
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
  const { game, mutateGame } = useRequiredGame();
  const [modalOpen, setModalOpen] = useState(false);
  const combinedRankingLabelId = useId();

  async function handleToggleCombinedRanking(combined: boolean) {
    // Optimistically reflect the choice; the server broadcasts the fresh game
    // row (and a refreshed leaderboard) to every device on success.
    mutateGame({ ...game, combinedRanking: combined }, false);
    try {
      await updateCombinedRanking(gameId, combined);
    } catch (err) {
      // Roll back the optimistic change on failure.
      mutateGame({ ...game, combinedRanking: !combined }, false);
      reportError(err);
    }
  }

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
      {sections.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <label
            id={combinedRankingLabelId}
            className="text-sm font-semibold text-gray-700"
          >
            Combined ranking across sections
          </label>
          <Toggle
            value={game.combinedRanking}
            offLabel="Separate"
            onLabel="Combined"
            labelledBy={combinedRankingLabelId}
            onChange={handleToggleCombinedRanking}
          />
        </div>
      )}
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
