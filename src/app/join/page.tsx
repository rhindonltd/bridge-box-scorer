"use client";

import SelectGamePage from "@/components/pages/SelectGamePage";
import { useRouter } from "next/navigation";

export default function JoinRoute() {
  const router = useRouter();

  function onGameSelected(gameId: string) {
    router.push(`/game/${gameId}/join/player`);
  }

  return <SelectGamePage onGameSelected={onGameSelected} />;
}
