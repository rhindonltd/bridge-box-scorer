"use client";

import RoundInfo from "@/app/game/[gameId]/play/[initialSeat]/RoundInfo";
import React from "react";
import { Player } from "@/db/games/tables/players";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import type { RoundHalfMatch } from "@/hooks/play-state-machine";

interface Props {
  round: number;
  table: number;
  boards: number[];
  players: {
    N: Player;
    S: Player;
    E: Player;
    W: Player;
  };
  /** Present for a "2 half matches" round this pair is in. */
  halfMatch?: RoundHalfMatch;
  /** §2.4.7: the opponent is an empty "expected late" seat (not yet arrived). */
  opponentExpectedLate?: boolean;
  /** Design §11: the opponents withdrew — nothing to play this round. */
  opponentWithdrawn?: boolean;
  onEnterRound: () => void;
  /**
   * Move past a round whose opponent is expected-late and has not arrived. The
   * late pair may be missing this very round, so the waiting pair needs a way
   * forward rather than being stuck. Advances to the next round (same path a
   * sit-out uses). Only shown when `opponentExpectedLate`.
   */
  onContinuePastLateOpponent: () => void;
  /** Right-hand header content (the play header menu). */
  headerRight?: React.ReactNode;
}

export function RoundInfoPage({
  round,
  table,
  boards,
  players,
  halfMatch,
  opponentExpectedLate,
  opponentWithdrawn,
  onEnterRound,
  onContinuePastLateOpponent,
  headerRight,
}: Props) {
  return (
    <GamePageLayout
      headerTitle={`Table ${table}, Round ${round}`}
      headerRight={headerRight}
      hideBack
      centerContent={true}
      // With no opponent at the table yet (they're marked expected late), there
      // is nothing to ENTER — a result needs two pairs. So instead of the Enter
      // Round button, offer a Continue: the pair waits (the round opens
      // automatically if the director seats the latecomers) OR moves on when
      // the late pair is missing this round. An ordinary round keeps Enter
      // Round.
      actions={
        opponentExpectedLate || opponentWithdrawn ? (
          <button
            onClick={onContinuePastLateOpponent}
            data-testid="play-continue-late-opponent"
            className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Move on to next round
          </button>
        ) : (
          <button
            onClick={onEnterRound}
            data-testid="play-enter-round"
            className="w-full py-3 text-lg font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Enter Round
          </button>
        )
      }
    >
      <RoundInfo
        boards={boards}
        table={table}
        players={players}
        halfMatch={halfMatch}
        opponentExpectedLate={opponentExpectedLate}
        opponentWithdrawn={opponentWithdrawn}
      />
    </GamePageLayout>
  );
}
