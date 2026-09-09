"use client";

import { useState } from "react";
import { useSections, ClientSection } from "@/hooks/sections";

/**
 * Track which section the director is currently working on for a setup page.
 *
 * Selection is per-page and defaults to the first section. If the selected
 * section disappears (e.g. it was deleted), it falls back to the first
 * remaining section so the page never points at a missing section.
 */
export function useSectionSelection(gameId: string): {
  sections: ClientSection[];
  selected: string | null;
  setSelected: (section: string) => void;
} {
  const { sections } = useSections(gameId);
  const [selected, setSelected] = useState<string | null>(null);

  const first = sections[0]?.section ?? null;
  const stillPresent =
    selected != null && sections.some((s) => s.section === selected);
  const effective = stillPresent ? selected : first;

  return { sections, selected: effective, setSelected };
}
