"use client";

import { ManageMovementPage } from "@/app/game/[gameId]/manage/movement/ManageMovementPage";
import { useParams } from "next/navigation";

export default function ManageMovementRoute() {
  const params = useParams<{ gameId: string }>();
  const gameId = params.gameId;

  return <ManageMovementPage backHref={`/manage/${gameId}/menu`} />;
}
