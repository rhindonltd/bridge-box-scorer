"use client";

import { AssignmentProvider } from "@/context/AssignmentContext";
import { GameProvider } from "@/context/GameContext";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GameProvider>
      <AssignmentProvider>{children}</AssignmentProvider>
    </GameProvider>
  );
}
