"use client";

import { useState } from "react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { DealEntry } from "@/components/deal/DealEntry";
import { Deal } from "@/model/common";

interface Props {
  /** The board numbers played in the round just finished. */
  boards: number[];
  /**
   * Submit one board's deal. Resolves with `{ stored }` — false when another
   * player had already entered that board (first-wins), so we show it as
   * already recorded. Rejects on an invalid/failed submission.
   */
  onSubmitDeal: (boardNumber: number, deal: Deal) => Promise<{ stored: boolean }>;
  /** Leave the deal step (all boards done, or the player chose to skip). */
  onDone: () => void;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

/**
 * Optional post-round screen: enter the dealt cards for the boards just played.
 *
 * Entering cards is never required — the player can skip the whole step or stop
 * after any board. It only appears once the round's results are all in, so a
 * slow pair is never held up by card entry. Boards are entered one at a time;
 * each saved (or already-entered) board advances to the next, and finishing the
 * last board leaves the step.
 */
export function EnterDealsPage({
  boards,
  onSubmitDeal,
  onDone,
  headerRight,
}: Props) {
  const [index, setIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [alreadyEntered, setAlreadyEntered] = useState<Deal | null>(null);
  const [saving, setSaving] = useState(false);

  const board = boards[index];
  const isLast = index >= boards.length - 1;

  function advance() {
    setAlreadyEntered(null);
    setError(null);
    if (isLast) {
      onDone();
    } else {
      setIndex((i) => i + 1);
    }
  }

  async function handleSubmit(deal: Deal) {
    setSaving(true);
    setError(null);
    try {
      const { stored } = await onSubmitDeal(board, deal);
      if (stored) {
        advance();
      } else {
        // Someone else entered this board first — show what they entered, then
        // let the player move on.
        setAlreadyEntered(deal);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the cards");
    } finally {
      setSaving(false);
    }
  }

  return (
    <GamePageLayout
      headerTitle="Enter cards"
      headerRight={headerRight}
      hideBack
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onDone}
            data-testid="skip-deals"
            className="flex-1 rounded-lg border py-3 text-lg font-medium text-gray-700"
          >
            {index === 0 ? "Skip" : "Done"}
          </button>
          {alreadyEntered && (
            <button
              type="button"
              onClick={advance}
              data-testid="deals-next-board"
              className="flex-1 rounded-lg bg-blue-600 py-3 text-lg font-bold text-white"
            >
              {isLast ? "Finish" : "Next board"}
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-1 flex-col">
        <div className="px-4 pt-3 text-sm text-gray-600">
          Board {board} ({index + 1} of {boards.length}). Entering the cards is
          optional.
        </div>

        {error && (
          <div className="bg-red-100 px-4 py-2 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        <DealEntry
          key={board}
          boardNumber={board}
          onSubmit={handleSubmit}
          readOnlyDeal={alreadyEntered}
        />

        {saving && (
          <div className="px-4 pb-2 text-center text-sm text-gray-500">
            Saving…
          </div>
        )}
      </div>
    </GamePageLayout>
  );
}
