import { Player } from "@/db/games/tables/players";
import React from "react";

interface Props {
  label: string;
  player: Omit<Player, "id"> | null;
  /**
   * When the seat is empty AND the director has marked it "expected late"
   * (§2.4.7), the placeholder reads "Late" (in sky, matching the seat's
   * highlight) instead of "Empty", so the director can see at a glance which
   * empty seats are awaiting a known pair versus simply unfilled. Ignored when
   * the seat is occupied.
   */
  expectedLate?: boolean;
}

export default function PlayerCard({ label, player, expectedLate }: Props) {
  const emptyIsLate = !player && expectedLate;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="font-bold mb-1 text-sm text-center">{label}</div>
      <div
        className={`text-base px-2 py-1.5 rounded-md text-center w-full max-w-[120px] break-words shadow
      ${
        player
          ? "bg-white text-gray-900"
          : emptyIsLate
            ? "bg-sky-50 text-sky-800 border border-dashed border-sky-300"
            : "bg-gray-100 text-gray-600 border border-dashed border-gray-300"
      }`}
      >
        {player ? (
          <>
            <div className="font-bold">{player.firstName}</div>
            <div>{player.lastName}</div>
          </>
        ) : (
          <div className="italic text-sm py-1">
            {emptyIsLate ? "Late" : "Empty"}
          </div>
        )}
      </div>
    </div>
  );
}
