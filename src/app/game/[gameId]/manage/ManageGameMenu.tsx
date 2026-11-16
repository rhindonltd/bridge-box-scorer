"use client";

import { useRouter } from "next/navigation";
import useSWR from "swr";
import { ManageGameMenuPage } from "@/app/game/[gameId]/manage/ManageGameMenuPage";
import { useGameStarted } from "@/hooks/game-started";
import { unwrapFetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";
import type { BridgeGame } from "@/db/game-index/schema";

export function ManageGameMenu({ gameId }: { gameId: string }) {
  const router = useRouter();

  const { started, isLoading: startedLoading } = useGameStarted(gameId);

  // "Review Mismatches" (§3.5) only applies to a Swiss game, where a
  // retroactive score adjustment can retro-change a later round's correct draw.
  const { data: game } = useSWR<BridgeGame>(
    swrKeys.game(gameId),
    unwrapFetcher<BridgeGame>("game"),
  );
  const isSwiss = game?.eventFormat === "SWISS";

  // Until we know whether the game has started, hide the state-gated buttons to
  // avoid flicker (e.g. briefly showing "Set Up Game" on an already-started
  // game). Delete Game is always shown. (Share Director Access lives in the
  // header hamburger, not this menu.)
  const startedKnown = !startedLoading;

  return (
    <ManageGameMenuPage
      onSetUpGameClick={() => router.push(`/game/${gameId}/create`)}
      onTravellersClick={() => router.push(`/game/${gameId}/manage/travellers`)}
      onEnterDealsClick={() => router.push(`/game/${gameId}/manage/deals`)}
      onMovementClick={() => router.push(`/game/${gameId}/manage/movement`)}
      onTimerClick={() => router.push(`/game/${gameId}/manage/timer`)}
      onReviewMismatchesClick={() =>
        router.push(`/game/${gameId}/manage/mismatches`)
      }
      onPairsClick={() => router.push(`/game/${gameId}/manage/pairs`)}
      onTeamsClick={() => router.push(`/game/${gameId}/manage/teams`)}
      onExportClick={() => router.push(`/game/${gameId}/manage/export`)}
      onDeleteGameClick={() =>
        router.push(`/game/${gameId}/manage/delete-game`)
      }
      showSetUpGame={startedKnown && !started}
      showTravellers={started}
      showEnterDeals={started}
      showMovement={started}
      showTimer={started}
      showReviewMismatches={started && isSwiss}
      // A Pairs / Swiss Pairs game has the Pairs roster; a Teams / Swiss Teams
      // game has the Teams roster. Neither shows until the game type is known.
      showPairs={started && game?.gameType === "PAIRS"}
      showTeams={started && game?.gameType === "TEAMS"}
      // "Export & Publish" groups the results-export / publishing actions; it is
      // only meaningful once the game has started.
      showExport={started}
    />
  );
}
