"use client";

import { useState, type ReactNode } from "react";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { useRequiredGame } from "@/context/GameContext";
import { useStartCheck } from "@/hooks/start-check";
import { startGame } from "@/lib/game-service";
import { errorMessage } from "@/lib/error-message";
import type { StartProblem } from "@/model/start-validator";

type Props = {
  /** Setup navigation menu rendered in the header's right-hand slot. */
  menu?: ReactNode;
};

/** Group problems by their section, preserving first-seen order. */
function groupBySection(
  problems: StartProblem[],
): { section: string | null; problems: StartProblem[] }[] {
  const groups: { section: string | null; problems: StartProblem[] }[] = [];
  const byKey = new Map<string, StartProblem[]>();

  for (const problem of problems) {
    const key = problem.section ?? "";
    let bucket = byKey.get(key);
    if (!bucket) {
      bucket = [];
      byKey.set(key, bucket);
      groups.push({ section: problem.section ?? null, problems: bucket });
    }
    bucket.push(problem);
  }

  return groups;
}

/**
 * The setup flow's "Start Game" screen: a scrollable list of outstanding
 * start-check issues (grouped by section for multi-section events) with a
 * pinned "Start Game" button. The button is enabled only when the game can
 * start; starting a game is director-authorised and runs the same flow the
 * Tables view used to own.
 */
export function StartGameScreen({ menu }: Props) {
  const { game, mutateGame } = useRequiredGame();
  const { canStart, problems, sitOutSeat } = useStartCheck(game.gameId);
  const [starting, setStarting] = useState(false);

  const multiSection = new Set(problems.map((p) => p.section)).size > 1;
  const groups = groupBySection(problems);

  async function handleStartGame() {
    /* v8 ignore next -- `starting` re-entrancy guard: the button is disabled while starting */
    if (!canStart || starting) return;
    setStarting(true);
    try {
      await startGame(game.gameId);
      await mutateGame();
    } catch (err) {
      alert(errorMessage(err, "Failed to start game"));
    } finally {
      setStarting(false);
    }
  }

  return (
    <GamePageLayout
      headerTitle="Start Game"
      headerRight={menu}
      hideBack
      // The Start Game button only appears in the ready state, inside the
      // centred card (below). While there are outstanding problems the screen
      // shows just the list of issues to resolve — no (disabled) button.
    >
      <div className="flex h-full min-h-0 flex-col">
        {canStart ? (
          // Ready state: the whole green card IS the Start Game control — one
          // large tap target in the card's own colour, rather than a clashing
          // blue button inside it. Centred in the available space.
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <button
              type="button"
              onClick={handleStartGame}
              disabled={starting}
              aria-label={starting ? "Starting game" : "Start game"}
              className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center text-green-900 transition hover:bg-green-100 hover:border-green-400 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:opacity-70 disabled:active:scale-100"
            >
              <div className="text-lg font-semibold">
                Everything&rsquo;s ready
              </div>
              <p className="text-sm">
                Seating and movement are valid.
              </p>
              {sitOutSeat && (
                <p className="text-sm text-gray-600">
                  One pair short — {sitOutSeat} will sit out each round.
                </p>
              )}
              <span className="mt-2 rounded-lg bg-green-600 px-5 py-2.5 text-base font-semibold text-white">
                {starting ? "Starting…" : "Tap to Start Game"}
              </span>
            </button>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Resolve the following before starting the game:
              </p>
              {groups.map((group, gi) => (
                <section
                  key={group.section ?? `group-${gi}`}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                >
                  {multiSection && group.section && (
                    <h2 className="border-b border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                      Section {group.section}
                    </h2>
                  )}
                  <ul className="flex list-disc flex-col gap-2 py-3 pl-8 pr-4 text-sm text-amber-800">
                    {group.problems.map((problem, i) => (
                      <li key={`${problem.code}-${i}`}>{problem.message}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        )}
      </div>
    </GamePageLayout>
  );
}
