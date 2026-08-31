"use client";

import SelectGamePage from "@/components/pages/SelectGamePage";
import { useRouter } from "next/navigation";

export default function DisplayRoute() {
  const router = useRouter();

  function onGameSelected(gameId: string) {
    router.push(`/game/${gameId}/display/menu`);
  }

  return (
    <SelectGamePage
      headerTitle="Display Game"
      onGameSelected={onGameSelected}
    />
  );
}
