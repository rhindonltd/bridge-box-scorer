import React from "react";
import { AwaitingMovement } from "@/components/join/AwaitingMovement";
import { GameInfo } from "@/components/common/GameInfo";

export function AwaitingMovementPage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-row w-full">
        <GameInfo />
      </div>

      <AwaitingMovement />
    </div>
  );
}
