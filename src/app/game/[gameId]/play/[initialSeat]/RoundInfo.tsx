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
}

export default function RoundInfo({ table, boards, players, halfMatch }: Props) {
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
