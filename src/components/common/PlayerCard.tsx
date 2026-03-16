import React from "react";

interface PlayerName {
  firstName: string;
  lastName: string;
}

interface Props {
  label: string;
  player?: PlayerName;
}

export default function PlayerCard({ label, player }: Props) {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="font-bold mb-1 text-sm text-center">{label}</div>
      <div
        className={`text-base px-2 py-1.5 rounded-md text-center w-full max-w-[120px] break-words shadow
      ${
        player
          ? "bg-white text-gray-900"
          : "bg-gray-100 text-gray-400 opacity-50 cursor-not-allowed"
      }`}
      >
        {player ? (
          <>
            <div className="font-bold">{player.firstName}</div>
            <div>{player.lastName}</div>
          </>
        ) : (
          <>
            <div className="italic">No</div>
            <div>Player</div>
          </>
        )}
      </div>
    </div>
  );
}
