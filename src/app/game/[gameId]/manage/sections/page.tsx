"use client";

import { useParams } from "next/navigation";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { SectionManagerContainer } from "@/components/manage/sections/SectionManagerContainer";

/**
 * Manage screen for sections: add / rename / resize sections and set a movement
 * per section. Section actions enforce their own guards (a section with seated
 * participants can't be shrunk below them or deleted).
 */
export default function ManageSectionsRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return (
    <GamePageLayout headerTitle="Sections" backHref={`/game/${gameId}/manage`}>
      <SectionManagerContainer gameId={gameId} />
    </GamePageLayout>
  );
}
