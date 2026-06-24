"use client";

import { useAssignment } from "@/context/AssignmentContext";

export function ParticipantInfo() {
    const { assignmentSelection } = useAssignment();

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
