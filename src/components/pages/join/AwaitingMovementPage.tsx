import React from "react";
import { AwaitingMovement } from "@/components/join/AwaitingMovement";
import { GameHeaderBar } from "@/components/layout/GameHeaderBar";

export function AwaitingMovementPage() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex flex-row w-full">
        <GameHeaderBar headerTitle="Awaiting Movement" />
      </div>

      <AwaitingMovement />
    </div>
  );
}
