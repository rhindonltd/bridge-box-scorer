"use client";

import { useAssignment } from "@/context/AssignmentContext";
import { useGame } from "@/context/GameContext";

export function SectionInfo() {
  const { game } = useGame();
  const { assignmentSelection } = useAssignment();

  if (!game) return null;

  return (
    <div className="flex flex-row w-full">
      <div className="flex flex-col bg-blue-200 py-2 flex-1">
        <div className="text-center font-bold">
          <span>{game.eventName}</span>
        </div>

        {(game.sessionName || game.sectionName) && (
          <div className="text-center font-bold">
            {game.sessionName && <span>{game.sessionName}</span>}
            {game.sessionName && game.sectionName && <span>, </span>}
            {game.sectionName && <span>{game.sectionName}</span>}
          </div>
        )}
      </div>
      {assignmentSelection && <Participant />}
    </div>
  );

  function Participant() {
    if (!assignmentSelection) return null;

    let label: string;
    let value: string;

    switch (assignmentSelection.type) {
      case "INDIVIDUAL":
        label = "Player";
        value = assignmentSelection.playerId;
        break;
      case "PAIR":
        label = "Pair";
        value = assignmentSelection.pairId;
        break;
      case "TEAM":
        label = "Team";
        value = assignmentSelection.teamId;
        break;
      default:
        return null;
    }

    return (
      <div className="flex flex-col bg-blue-400 py-2">
        <span className="text-center font-bold px-4">{label}</span>
        <span className="text-center font-bold px-4 text-xl">{value}</span>
      </div>
    );
  }
}
