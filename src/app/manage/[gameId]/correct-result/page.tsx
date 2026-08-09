"use client";

import { useRouter } from "next/navigation";
import { useGame } from "@/context/GameContext";

import CorrectResultPage from "@/components/pages/manage/correct-result/CorrectResultPage";

export default function CorrectResultRoute() {
  const router = useRouter();
  const { game } = useGame();

  return (<CorrectResultPage onResultCorrected={() => router.replace(`/manage/${game!.gameId}/menu`)} />);
}
