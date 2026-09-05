"use client";

import { useEffect, useState } from "react";
import { TimerProvider, useTimerContext } from "@/context/TimerContext";
import { useTimerDerived } from "@/hooks/timer-derived";
import { useRequiredGame } from "@/context/GameContext";
import { useSections } from "@/hooks/sections";
import { DisplayTimerPage } from "@/app/game/[gameId]/display/timer/DisplayTimerPage";

/* ---------------- INNER (consumes the timer context) ---------------- */

function TimerPageContent({ onBack }: { onBack?: () => void }) {
  const { timerState, now } = useTimerContext();

  const {
    remaining,
    phase,
    boardLabel,
    title,
    isRunning,
    projectedEndDate,
    warningSeconds,
  } = useTimerDerived(timerState, now());

  /* ---------------- LOCAL TICK (render only) ---------------- */

  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  /* ---------------- LOADING ---------------- */

  if (!timerState) {
    return (
      <div className="fixed inset-0 bg-black text-white flex items-center justify-center">
        Connecting…
      </div>
    );
  }

  /* ---------------- RENDER ---------------- */

  return (
    <>
      {onBack && (
        <button
          onClick={onBack}
          className="fixed left-4 top-4 z-10 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        >
          ← Sections
        </button>
      )}
      <DisplayTimerPage
        title={title}
        boardLabel={boardLabel}
        remaining={remaining}
        phase={phase}
        isRunning={isRunning}
        projectedEndDate={projectedEndDate}
        warningSeconds={warningSeconds}
      />
    </>
  );
}

/* ---------------- SECTION CHOOSER (multi-section) ---------------- */

function SectionChooser({
  sections,
  onChoose,
}: {
  sections: { section: string; label: string }[];
  onChoose: (section: string) => void;
}) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black text-white">
      <h1 className="text-4xl font-bold">Choose a section</h1>
      <div className="flex flex-wrap items-center justify-center gap-4">
        {sections.map((s) => (
          <button
            key={s.section}
            onClick={() => onChoose(s.section)}
            className="rounded-2xl bg-white/10 px-8 py-6 text-3xl font-semibold hover:bg-white/20 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            Section {s.section === s.label ? s.section : `${s.section} — ${s.label}`}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

export default function TimerPage() {
  const { game } = useRequiredGame();
  const { sections } = useSections(game.gameId);
  const [chosen, setChosen] = useState<string | null>(null);

  // Single-section games skip the chooser and show that section directly.
  if (sections.length <= 1) {
    const only = sections[0]?.section ?? "A";
    return (
      <TimerProvider section={only}>
        <TimerPageContent />
      </TimerProvider>
    );
  }

  if (!chosen) {
    return <SectionChooser sections={sections} onChoose={setChosen} />;
  }

  return (
    <TimerProvider section={chosen} key={chosen}>
      <TimerPageContent onBack={() => setChosen(null)} />
    </TimerProvider>
  );
}
