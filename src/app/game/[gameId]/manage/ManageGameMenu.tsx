"use client";

import { useRouter } from "next/navigation";
import { ManageGameMenuPage } from "@/app/game/[gameId]/manage/ManageGameMenuPage";

export function ManageGameMenu({ gameId }: { gameId: string }) {
  const router = useRouter();

  return (
    <ManageGameMenuPage
      onSetUpGameClick={() => router.push(`/game/${gameId}/create`)}
      onSectionsClick={() => router.push(`/game/${gameId}/manage/sections`)}
      onTravellersClick={() => router.push(`/game/${gameId}/manage/travellers`)}
      onMovementClick={() => router.push(`/game/${gameId}/manage/movement`)}
      onShareDirectorAccessClick={() =>
        router.push(`/game/${gameId}/manage/share-access`)
      }
      onDownloadUsebioClick={() =>
        router.push(`/game/${gameId}/manage/download-usebio`)
      }
      onDeleteGameClick={() =>
        router.push(`/game/${gameId}/manage/delete-game`)
      }
    />
  );
}
