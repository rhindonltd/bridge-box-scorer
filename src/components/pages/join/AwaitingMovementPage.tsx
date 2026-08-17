import React from "react";
import { AwaitingMovement } from "@/components/join/AwaitingMovement";
import { GamePageLayout } from "@/components/layout/GamePageLayout";

export function AwaitingMovementPage() {
  return (
      <GamePageLayout
          headerTitle="Awaiting Movement"
          centerContent={true}
          children={ <AwaitingMovement /> }
      />
  );
}
