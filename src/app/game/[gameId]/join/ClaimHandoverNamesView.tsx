"use client";

import { PageLayout } from "@/components/layout/PageLayout";
import PlayerSearch from "@/app/game/[gameId]/join/PlayerSearch";
import type { NewPlayer } from "@/db/games/tables/players";

interface Props {
  player1: NewPlayer | null;
  player2: NewPlayer | null;
  error: string | null;
  loading: boolean;
  onPlayer1Change: (player: NewPlayer | null) => void;
  onPlayer2Change: (player: NewPlayer | null) => void;
  onSubmit: () => void;
  onBack: () => void;
}

/**
 * The arriving real pair's name-entry step for a HANDOVER seat-transfer claim
 * (Path 2 — different device). Shown after a code is found to be a §2.4.7
 * handover: the arriving pair enter their names/EBU numbers (reusing the join
 * flow's {@link PlayerSearch}) before taking over the seat. No scoring options
 * are entered here — the director sets them later on the "Substitutions"
 * screen.
 */
export function ClaimHandoverNamesView({
  player1,
  player2,
  error,
  loading,
  onPlayer1Change,
  onPlayer2Change,
  onSubmit,
  onBack,
}: Props) {
  const canSubmit = player1 != null && player2 != null && !loading;

  return (
    <PageLayout
      headerTitle="Join Game"
      backAction={onBack}
      centerContent={true}
      actions={
        <button
          type="submit"
          form="claim-handover-names"
          disabled={!canSubmit}
          className="w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          {loading ? "Taking over…" : "Take over seat"}
        </button>
      }
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        {/* Styled as text rather than a heading: PlayerSearch renders selected
            players in <h3>s, so a page <h1>/<h2> here would skip a level
            (axe heading-order). The host seat-select screen avoids headings for
            the same reason. */}
        <p className="text-xl font-bold text-gray-900 mb-2 text-center">
          Take over this seat
        </p>
        <p className="text-base text-gray-600 mb-8 text-center">
          Another pair has been playing this seat. Enter your names to take over
          from the next board.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
          id="claim-handover-names"
          className="w-full max-w-xs space-y-4"
        >
          <PlayerSearch
            label="Player 1"
            value={player1}
            onChange={onPlayer1Change}
          />
          <PlayerSearch
            label="Player 2"
            value={player2}
            onChange={onPlayer2Change}
          />

          {error && (
            <p role="alert" className="text-red-600 text-base text-center">
              {error}
            </p>
          )}
        </form>
      </div>
    </PageLayout>
  );
}
