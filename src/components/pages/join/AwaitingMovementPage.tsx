import React from "react";
import { AwaitingMovement } from "@/components/join/AwaitingMovement";
import { GameInfo } from "@/components/common/GameInfo";
import { ParticipantInfo } from "@/components/common/ParticipantInfo";

export function AwaitingMovementPage() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
        <div className="flex flex-row w-full">
            <GameInfo />
            <ParticipantInfo />
        </div>

      <AwaitingMovement />
    </div>
  );
}
