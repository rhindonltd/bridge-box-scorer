"use client";

export type SetupStep = "tables" | "movements" | "timer";

interface Props {
  active: SetupStep;
  onSelect: (step: SetupStep) => void;
}

const TABS: { step: SetupStep; label: string }[] = [
  { step: "tables", label: "Tables" },
  { step: "movements", label: "Movement" },
  { step: "timer", label: "Timer" },
];

/**
 * Persistent segmented control for switching between the game setup views.
 * Visual pattern mirrors the byRound/byTable pill toggle in MovementDetailView.
 */
export function SetupTabs({ active, onSelect }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Game setup views"
      className="flex justify-center w-full flex-row p-3 bg-gray-50 border-b gap-2 shrink-0 px-4 pt-2"
    >
      {TABS.map(({ step, label }) => {
        const isActive = step === active;
        return (
          <button
            key={step}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(step)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              isActive
                ? "bg-blue-600 text-white"
                : "bg-white border text-gray-700 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
