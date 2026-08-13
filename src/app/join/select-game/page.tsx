"use client";

import SelectGamePage from "@/components/pages/common/SelectGamePage";
import { useRouter } from "next/navigation";

export default function SelectGameRoute() {
  const router = useRouter();

  function onGameSelected(gameId: string) {
    router.push(`/join/${gameId}/player`);
  }

  return <SelectGamePage onGameSelected={onGameSelected} />;
}
