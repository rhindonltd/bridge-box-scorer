"use client";

import SelectGamePage from "@/components/pages/join/SelectGamePage";
import { useRouter } from "next/navigation";

export default function SelectGame() {
  const router = useRouter();

  function onGameSelected(gameId: string) {
    router.push(`/join/${gameId}/player`);
  }

  return <SelectGamePage onGameSelected={onGameSelected} />;
}
