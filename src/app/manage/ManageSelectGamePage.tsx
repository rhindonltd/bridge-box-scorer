"use client";

import { SelectGame } from "@/components/common/SelectGame";
import { BridgeGame } from "@/db/game-index/schema";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";

interface Props {
  onGameSelected: (gameId: string, gameName?: string) => void;
}

export default function ManageSelectGamePage({ onGameSelected }: Props) {
  const gamesFetcher = async (url: string): Promise<BridgeGame[]> => {
    const response: { games: BridgeGame[] } = await fetcher(url);

    return response.games;
  };

  const { data, isLoading } = useSWR<BridgeGame[]>(
    "/api/games/all",
    gamesFetcher,
  );

  return (
    <SelectGame
      headerTitle="Manage Game"
      games={data ?? []}
      isLoading={isLoading}
      onGameSelected={onGameSelected}
    />
  );
}
