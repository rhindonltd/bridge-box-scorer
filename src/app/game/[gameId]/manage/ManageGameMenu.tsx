"use client";

import { useRouter } from "next/navigation";
import { ManageGameMenuPage } from "@/app/game/[gameId]/manage/ManageGameMenuPage";
import { useGameStarted } from "@/hooks/game-started";
import { useResultsComplete } from "@/hooks/results-complete";

export function ManageGameMenu({ gameId }: { gameId: string }) {
  const router = useRouter();

  const { started, isLoading: startedLoading } = useGameStarted(gameId);
  const { allResultsIn } = useResultsComplete(gameId);

  // Until we know whether the game has started, hide the state-gated buttons to
  // avoid flicker (e.g. briefly showing "Set Up Game" on an already-started
  // game). Share Director Access and Delete Game are always shown.
  const startedKnown = !startedLoading;

  // "Download USEBIO" is only meaningful once the game has started. Show it for
  // the whole time after the game has started, disabled until every result is
  // in (and while the completion signal is still loading).
  const showDownloadUsebio = started;

  return (
    <ManageGameMenuPage
      onSetUpGameClick={() => router.push(`/game/${gameId}/create`)}
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
      showSetUpGame={startedKnown && !started}
      showTravellers={started}
      showMovement={started}
      showDownloadUsebio={showDownloadUsebio}
      downloadUsebioDisabled={!allResultsIn}
    />
  );
}
