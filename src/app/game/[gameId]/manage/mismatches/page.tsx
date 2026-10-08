"use client";

import { useParams } from "next/navigation";
import { ReviewMismatchesPage } from "@/app/game/[gameId]/manage/mismatches/ReviewMismatchesPage";

export default function ReviewMismatchesRoute() {
  const params = useParams<{ gameId: string }>();
  return <ReviewMismatchesPage gameId={params.gameId} />;
}
