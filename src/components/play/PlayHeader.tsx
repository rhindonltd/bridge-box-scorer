"use client";

import { useGame } from "@/context/GameContext";
import { useAssignment } from "@/context/AssignmentContext";

interface Props {
  /** Key context info displayed prominently centred (e.g., "Board 5", "Table 2, Round 1") */
  detail?: string;
}

/**
 * Unified header for play screens.
 * Top line: context (event name + pair/player).
 * Bottom line: key detail (Board N / Table + Round) — bold, centred, distinct background.
 *
 * Font sizes are larger than typical to accommodate older users with reduced vision.
 */
export function PlayHeader({ detail }: Props) {
  const { game } = useGame();
  const { assignment } = useAssignment();

  if (!game) return null;

  const participantLabel = assignment
    ? `${assignment.type === "PAIR" ? "Pair" : "Team"} ${assignment.id}`
    : null;

  return (
    <div className="shrink-0">
      {/* Context bar */}
      <div className="bg-gray-200 text-gray-800 px-3 py-2 flex items-start justify-between text-base">
        <div className="truncate">
          <div className="font-semibold">{game.eventName}</div>
          {(game.sessionName || game.sectionName) && (
            <div className="text-sm text-gray-600">
              {game.sessionName}
              {game.sessionName && game.sectionName && ", "}
              {game.sectionName}
            </div>
          )}
        </div>
        {participantLabel && (
          <span className="font-semibold whitespace-nowrap ml-2">{participantLabel}</span>
        )}
      </div>

      {/* Detail bar — prominent, centred */}
      {detail && (
        <div className="bg-blue-600 text-white px-3 py-2.5 text-center font-bold text-lg">
          {detail}
        </div>
      )}
    </div>
  );
}
