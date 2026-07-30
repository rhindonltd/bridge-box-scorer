import React from "react";
import { AwaitingMovement } from "@/components/join/AwaitingMovement";
import { GameInfo } from "@/components/common/GameInfo";

export function AwaitingMovementPage() {
  return (
    <div className="min-h-dvh flex flex-col bg-gray-100">
      <div className="flex flex-row w-full">
        <GameInfo />
      </div>

      <AwaitingMovement />
    </div>
  );
}
