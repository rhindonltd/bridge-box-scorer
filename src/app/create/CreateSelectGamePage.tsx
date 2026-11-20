"use client";

import Link from "next/link";
import useSWR from "swr";
import { SelectGame } from "@/components/common/SelectGame";
import type { BridgeGame } from "@/db/game-index/schema";
import { unwrapFetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";

interface Props {
  onGameSelected: (gameId: string, gameName?: string) => void;
}

/**
 * The "Create Game" screen: a button to create a new game, and the games that
 * have been created but not started yet, so a director can carry on setting
 * one up. Started games are under "Manage Game" instead.
 */
export default function CreateSelectGamePage({ onGameSelected }: Props) {
  const { data, isLoading } = useSWR<BridgeGame[]>(
    swrKeys.notStartedGames(),
    unwrapFetcher<BridgeGame[]>("games"),
  );

  return (
    <SelectGame
      headerTitle="Create Game"
      games={data ?? []}
      isLoading={isLoading}
      onGameSelected={onGameSelected}
      topContent={
        <Link
          href="/create/new"
          className="block w-full rounded-xl bg-blue-600 py-3.5 text-center text-lg font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Create Game
        </Link>
      }
      listHeading="Not started yet"
      emptyMessage="No games are waiting to be started."
      // Back always returns to the home menu (see ManageSelectGamePage).
      backHref="/"
    />
  );
}
