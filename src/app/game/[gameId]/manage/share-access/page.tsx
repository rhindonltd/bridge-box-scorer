"use client";

import { ShareDirectorAccessPage } from "@/app/game/[gameId]/manage/share-access/ShareDirectorAccessPage";
import { useParams } from "next/navigation";

export default function ShareDirectorAccessRoute() {
  const params = useParams<{ gameId: string }>();

  return <ShareDirectorAccessPage gameId={params.gameId} />;
}
