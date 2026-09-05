"use client";

interface Props {
  sections: { section: string; label: string }[];
  selected: string;
  onSelect: (section: string) => void;
}

/**
 * Section selector for the director's per-section timer. Shown for
 * multi-section games so the director configures/controls one section's timer
 * at a time (mirroring the per-section movement picker). Rendered above the
 * timer config/live controls.
 */
export function TimerSectionPicker({ sections, selected, onSelect }: Props) {
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
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
              active
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            Section {s.section === s.label ? s.section : `${s.section} — ${s.label}`}
          </button>
        );
      })}
    </div>
  );
}
