"use client";

import { ManageGameMenuPage } from "@/app/game/[gameId]/manage/ManageGameMenuPage";
import { useRouter, useParams } from "next/navigation";

export default function ManageGameMenuRoute() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const id = params.gameId;

  return (
    <ManageGameMenuPage
      onSetUpGameClick={() => router.push(`/game/${id}/create`)}
      onTravellersClick={() => router.push(`/game/${id}/manage/travellers`)}
      onMovementClick={() => router.push(`/game/${id}/manage/movement`)}
      onShareDirectorAccessClick={() =>
        router.push(`/game/${id}/manage/share-access`)
      }
      onDownloadUsebioClick={() =>
        router.push(`/game/${id}/manage/download-usebio`)
      }
      onDeleteGameClick={() => router.push(`/game/${id}/manage/delete-game`)}
    />
  );
}
