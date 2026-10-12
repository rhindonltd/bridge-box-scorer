import React from "react";
import CardTable from "@/components/common/CardTable";
import { Player } from "@/db/games/tables/players";
import { formatBoardRange } from "@/lib/board-range-formatter";
import type { RoundHalfMatch } from "@/hooks/play-state-machine";

type SeatPlayers = {
  N: Player;
  S: Player;
  E: Player;
  W: Player;
};

interface Props {
  table: number;
  boards: number[];
  players: SeatPlayers;
  /**
   * Present only for a Swiss Pairs "2 half matches" round this pair is in. The
   * anchor plays both halves (two segments, opponent change at the midpoint); a
   * non-anchor plays only its half. Drives an explicit switch instruction.
   */
  halfMatch?: RoundHalfMatch;
  /**
   * §2.4.7: the opponent at this table has not arrived yet (a seat the director
   * marked "expected late"). Shows a "running late" note so the pair knows to
   * wait for them, rather than reading the empty seats as a sit-out.
   */
  opponentExpectedLate?: boolean;
}

export default function RoundInfo({
  table,
  boards,
  players,
  halfMatch,
  opponentExpectedLate,
}: Props) {
  if (halfMatch) {
    return (
      <HalfMatchRoundInfo table={table} halfMatch={halfMatch} />
    );
  }

  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full">
      <header className="flex flex-col items-center text-lg font-bold mb-6 gap-1">
        <div>
          {boards.length === 1 ? "Board" : "Boards"} {formatBoardRange(boards)}
        </div>
      </header>
      {opponentExpectedLate && (
        <div
          data-testid="opponent-running-late"
          className="mb-6 max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900"
        >
          Your opponents haven&rsquo;t arrived yet — they&rsquo;re running late.
          Please wait for them before starting; the director will seat them when
          they get here.
        </div>
      )}
      <CardTable tableNumber={table} players={players} />
    </div>
  );
}

/**
 * Round-info for a 2-half-matches round. The anchor sees both halves and an
 * explicit midpoint-switch instruction; a non-anchor sees only its half plus a
 * note of when it arrives/leaves. Players for each half come from the segment.
 */
function HalfMatchRoundInfo({
  table,
  halfMatch,
}: {
  table: number;
  halfMatch: RoundHalfMatch;
}) {
  const isAnchor = halfMatch.role === "anchor";

  return (
    <div
      className="flex flex-col items-center justify-center flex-1 w-full gap-6"
      data-testid="round-info-half-match"
    >
      {isAnchor ? (
        <>
          <p className="max-w-md text-center text-sm text-gray-600">
            You stay at table {table} for the whole round and play two half
            matches. Change opponents at the midpoint.
          </p>
          {halfMatch.segments.map((seg) => (
            <section
              key={seg.half}
              className="flex flex-col items-center gap-2"
              data-testid={`half-${seg.half}`}
            >
              <header className="text-base font-bold">
                {seg.half === "first" ? "First half" : "Second half"} —{" "}
                {seg.boards.length === 1 ? "Board" : "Boards"}{" "}
                {formatBoardRange(seg.boards)}
              </header>
              <CardTable
                tableNumber={table}
                players={seg.players as SeatPlayers}
              />
            </section>
          ))}
        </>
      ) : (
        <>
          <p className="max-w-md text-center text-sm text-gray-600">
            {halfMatch.role === "firstHalf"
              ? `You play the first half at table ${table}, then you're done for the round.`
              : `You come in for the second half at table ${table}.`}
          </p>
          {halfMatch.segments.map((seg) => (
            <section
              key={seg.half}
              className="flex flex-col items-center gap-2"
              data-testid={`half-${seg.half}`}
            >
              <header className="text-base font-bold">
                {seg.half === "first" ? "First half" : "Second half"} —{" "}
                {seg.boards.length === 1 ? "Board" : "Boards"}{" "}
                {formatBoardRange(seg.boards)}
              </header>
              <CardTable
                tableNumber={table}
                players={seg.players as SeatPlayers}
              />
            </section>
          ))}
        </>
      )}
    </div>
  );
}
