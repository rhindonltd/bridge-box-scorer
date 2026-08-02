"use client";

import SelectGamePage from "@/components/pages/join/SelectGamePage";
import { useRouter } from "next/navigation";

export default function DisplaySelectGame() {
  const router = useRouter();

  function onGameSelected(gameId: string) {
    router.push(`/display/${gameId}`);
  }

  return <SelectGamePage onGameSelected={onGameSelected} />;
}
