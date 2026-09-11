"use client";

import { useSetupSections } from "./useSetupSections";
import { SectionMovementPicker } from "./SectionMovementPicker";

interface Props {
  gameId: string;
}

/**
 * The setup flow's Movement step: pick a movement for one section at a time.
 *
 * Section navigation (and adding sections) is handled by the shared section
 * pills; renaming/deleting lives on the separate "Manage sections" screen. The
 * body is the per-section movement picker for the currently-selected section.
 */
export function MovementStep({ gameId }: Props) {
  const { sections, selected, pills, modal } = useSetupSections(gameId);

  const current = sections.find((s) => s.section === selected);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 justify-center border-b border-gray-200 bg-gray-50 px-4 py-3">
        {pills}
      </div>

      <div className="min-h-0 flex-1">
        {current && (
          <SectionMovementPicker
            key={current.section}
            gameId={gameId}
            section={current.section}
            tables={current.tables}
            selectedMovement={current.selectedMovement}
            // The selected section is already shown by the pills, so the picker
            // omits its own "Section X" heading.
            multiSection={false}
          />
        )}
      </div>

      {modal}
    </div>
  );
}
