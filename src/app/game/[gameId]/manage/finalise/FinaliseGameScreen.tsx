"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { useRequiredGame } from "@/context/GameContext";
import { useFinaliseCheck } from "@/hooks/finalise-check";
import { useSections } from "@/hooks/sections";
import { finaliseGame } from "@/lib/game-service";
import { errorMessage } from "@/lib/error-message";
import type { FinaliseProblem } from "@/model/finalise-validator";

/** Group problems by their section, preserving first-seen order. */
function groupBySection(
  problems: FinaliseProblem[],
): { section: string | null; problems: FinaliseProblem[] }[] {
  const groups: { section: string | null; problems: FinaliseProblem[] }[] = [];
  const byKey = new Map<string, FinaliseProblem[]>();

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
 * The "Finalise Game" screen: a list of the game problems that must be fixed
 * first (results still outstanding), or, when the game is clean, one large
 * card that finalises it after a confirmation. Finalising makes the game
 * read-only and moves it to Export Game; a director can reopen it there.
 */
export function FinaliseGameScreen() {
  const router = useRouter();
  const { game, mutateGame } = useRequiredGame();
  const { canFinalise, problems, isLoading } = useFinaliseCheck(game.gameId);
  const { sections } = useSections(game.gameId);
  const sectionName = (letter: string) =>
    sections.find((s) => s.section === letter)?.label ?? letter;

  const [confirming, setConfirming] = useState(false);
  const [finalising, setFinalising] = useState(false);

  const multiSection = new Set(problems.map((p) => p.section)).size > 1;
  const groups = groupBySection(problems);

  async function handleFinalise() {
    /* v8 ignore next -- re-entrancy guard: the buttons are disabled while finalising */
    if (!canFinalise || finalising) return;
    setFinalising(true);
    try {
      await finaliseGame(game.gameId);
      // Finalised games leave the manage list: go back to the main menu.
      router.replace("/");
      void mutateGame();
    } catch (err) {
      alert(errorMessage(err, "Failed to finalise game"));
      setConfirming(false);
    } finally {
      setFinalising(false);
    }
  }

  return (
    <GamePageLayout
      headerTitle="Finalise Game"
      backHref={`/game/${game.gameId}/manage`}
    >
      <div className="flex h-full min-h-0 flex-col">
        {isLoading ? null : canFinalise ? (
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            {confirming ? (
              <div
                role="dialog"
                aria-label="Confirm finalise"
                className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center text-green-900"
              >
                <div className="text-lg font-semibold">Finalise this game?</div>
                <p className="text-sm">
                  The game becomes read-only and moves to Export Game. You can
                  reopen it from there if you need to make a change.
                </p>
                <div className="mt-2 flex w-full gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={finalising}
                    className="flex-1 rounded-lg bg-gray-200 px-5 py-2.5 text-base font-semibold text-gray-800 hover:bg-gray-300 disabled:opacity-70"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFinalise}
                    disabled={finalising}
                    className="flex-1 rounded-lg bg-green-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-70"
                  >
                    {finalising ? "Finalising…" : "Finalise"}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                aria-label="Finalise game"
                className="flex w-full max-w-md flex-col items-center gap-3 rounded-xl border-2 border-green-300 bg-green-50 p-6 text-center text-green-900 transition hover:bg-green-100 hover:border-green-400 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
              >
                <div className="text-lg font-semibold">
                  Everything&rsquo;s in
                </div>
                <p className="text-sm">Every result has been entered.</p>
                <span className="mt-2 rounded-lg bg-green-600 px-5 py-2.5 text-base font-semibold text-white">
                  Tap to Finalise Game
                </span>
              </button>
            )}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="flex flex-col gap-4">
              <p className="text-sm text-gray-600">
                Resolve the following before finalising the game:
              </p>
              {groups.map((group, gi) => (
                <section
                  key={group.section ?? `group-${gi}`}
                  className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
                >
                  {multiSection && group.section && (
                    <h2 className="border-b border-gray-200 bg-gray-100 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-gray-600">
                      {sectionName(group.section)}
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
