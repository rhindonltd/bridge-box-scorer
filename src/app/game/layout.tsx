"use client";

import { GameProvider } from "@/context/GameContext";

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GameProvider>{children}</GameProvider>;
}
