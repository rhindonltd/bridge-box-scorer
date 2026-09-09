"use client";

import { Plus } from "lucide-react";

interface Props {
  sections: { section: string; label: string }[];
  selected: string;
  onSelect: (section: string) => void;
  /**
   * When provided, a trailing "+ Add section" pill is shown. Omit to hide it
   * (e.g. once a game is in progress and sections can no longer be added).
   */
  onAddSection?: () => void;
}

const pillBase =
  "rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";

/**
 * Shared per-section selector for the setup pages (Tables, Movement, Timer).
 * Renders one pill per section plus an optional trailing "+ Add section" pill.
 * The director works on one section at a time; selection is owned by the caller
 * (see `useSectionSelection`).
 */
export function SectionPills({
  sections,
  selected,
  onSelect,
  onAddSection,
}: Props) {
  return (
    <div
      role="tablist"
      aria-label="Section"
      className="flex w-full max-w-md flex-wrap gap-2"
    >
      {sections.map((s) => {
        const active = s.section === selected;
        return (
          <button
            key={s.section}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(s.section)}
            className={`${pillBase} ${
              active
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Section{" "}
            {s.section === s.label ? s.section : `${s.section} — ${s.label}`}
          </button>
        );
      })}

      {onAddSection && (
        <button
          type="button"
          onClick={onAddSection}
          className={`${pillBase} flex items-center gap-1 border border-dashed border-gray-400 bg-white text-gray-700 hover:bg-gray-100`}
        >
          <Plus size={14} aria-hidden="true" />
          Add section
        </button>
      )}
    </div>
  );
}
