"use client";

import { notFound } from "next/navigation";
import Loading from "@/app/loading";
import { useGame } from "@/context/GameContext";

export default function GameGate({ children }: { children: React.ReactNode }) {
  const { game, isLoading } = useGame();

  if (isLoading) {
    return <Loading />;
  }

  if (!game) {
    notFound();
  }

  return <>{children}</>;
}
