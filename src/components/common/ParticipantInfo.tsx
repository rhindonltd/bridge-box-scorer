"use client";

import { useAssignment } from "@/context/AssignmentContext";

export function ParticipantInfo() {
  const { assignment } = useAssignment();

  if (!assignment) return null;

  let label: string;

  switch (assignment.type) {
    case "PAIR":
      label = "Pair";
      break;
    case "TEAM":
      label = "Team";
      break;
    default:
      return null;
  }

  return (
    <div className="flex flex-col bg-blue-100 text-blue-900 py-2">
      <span className="text-center font-bold px-4">{label}</span>
      <span className="text-center font-bold px-4 text-xl">
        {assignment.id}
      </span>
    </div>
  );
}
