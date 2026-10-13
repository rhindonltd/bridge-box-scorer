import { useState } from "react";
import { NewPlayer } from "@/db/games/tables/players";
import PlayerSearch from "@/app/game/[gameId]/join/PlayerSearch";
import { parseSeat, Seat } from "@/model/participants";

interface Props {
  seat: Seat;
  /**
   * Whether to show the optional "Team name" field. True only for the home
   * (NS) pair of a Teams event; the entered value (if any) is passed as the
   * third argument to `onSubmitPair`.
   */
  showTeamName?: boolean;
  /**
   * EBU numbers already seated elsewhere in the event. A player chosen from the
   * search whose number is in this set is flagged immediately (rather than only
   * on submit). Defaults to empty. The server still enforces this on submit as
   * the authority (and covers seats filled concurrently on other devices).
   */
  seatedNationalIds?: Set<string>;
  onSubmitPair: (
    player1: NewPlayer,
    player2: NewPlayer,
    teamName?: string,
  ) => void;
}

export default function EnterPlayerNames({
  seat,
  showTeamName = false,
  seatedNationalIds,
  onSubmitPair,
}: Props) {
  const [player1, setPlayer1] = useState<NewPlayer | null>(null);
  const [player2, setPlayer2] = useState<NewPlayer | null>(null);
  const [teamName, setTeamName] = useState("");

  const parsedSeat = parseSeat(seat);

  const player1Label = parsedSeat.direction === "NS" ? "North" : "East";
  const player2Label = parsedSeat.direction === "NS" ? "South" : "West";

  // The same EBU number can't be both players of a pair (guests, with no
  // national id, are exempt). Caught here for instant feedback; the server also
  // enforces it — and additionally rejects a number already seated elsewhere.
  const sameNationalId =
    player1?.nationalId != null &&
    player1.nationalId === player2?.nationalId;

  // An EBU number already seated elsewhere in the event, flagged the moment the
  // player is chosen from the search rather than only on submit. Tracked per
  // player so the clashing one's chip is shown in error colours; the first
  // clash drives the message. Guests (no national id) can never clash.
  const alreadySeated = seatedNationalIds ?? new Set<string>();
  const player1AlreadySeated =
    player1?.nationalId != null && alreadySeated.has(player1.nationalId);
  const player2AlreadySeated =
    player2?.nationalId != null && alreadySeated.has(player2.nationalId);
  const clashingNationalId = player1AlreadySeated
    ? player1!.nationalId
    : player2AlreadySeated
      ? player2!.nationalId
      : null;

  const canSubmit =
    player1 !== null &&
    player2 !== null &&
    !sameNationalId &&
    clashingNationalId === null;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="w-full bg-blue-900 text-white px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-xl font-semibold">
          Table {parsedSeat.tableNumber}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto w-full max-w-xl space-y-4 p-4">
        <div className="space-y-6">
          <PlayerSearch
            label={player1Label}
            value={player1}
            onChange={setPlayer1}
            invalid={player1AlreadySeated}
          />

          <PlayerSearch
            label={player2Label}
            value={player2}
            onChange={setPlayer2}
            invalid={player2AlreadySeated}
          />

          {showTeamName && (
            <div className="space-y-1">
              <label
                htmlFor="team-name"
                className="block text-sm font-medium text-gray-700"
              >
                Team name (optional)
              </label>
              <input
                id="team-name"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Defaults to North's surname"
                className="
                  w-full
                  rounded-xl
                  border border-gray-300
                  px-3 py-2
                  text-base
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                "
              />
            </div>
          )}
        </div>

        {sameNationalId && (
          <p role="alert" className="text-sm font-medium text-red-700">
            Both players have the same EBU number ({player1!.nationalId}). Each
            player can only take one seat.
          </p>
        )}

        {!sameNationalId && clashingNationalId && (
          <p role="alert" className="text-sm font-medium text-red-700">
            A player with EBU number {clashingNationalId} is already seated in
            this event. Pick a different player.
          </p>
        )}

        <button
          disabled={!canSubmit}
          onClick={() =>
            onSubmitPair(
              player1!,
              player2!,
              showTeamName ? teamName : undefined,
            )
          }
          className="
            w-full
            rounded-xl
            bg-blue-600
            py-3
            font-medium
            text-white
            disabled:opacity-50
          "
        >
          Enter Pair
        </button>
      </div>
    </div>
  );
}
