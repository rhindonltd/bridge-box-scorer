"use client";

import { SelectGame } from "@/components/common/SelectGame";
import { BridgeGame } from "@/db/game-index/schema";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";

interface Props {
  onGameSelected: (gameId: string, gameName?: string) => void;
}

export default function ManageSelectGamePage({ onGameSelected }: Props) {
  const { data, isLoading } = useSWR<BridgeGame[]>("/api/games/all", fetcher);

  return (
    <SelectGame
      headerTitle="Manage Game"
      games={data ?? []}
      isLoading={isLoading}
      onGameSelected={onGameSelected}
    />
  );
}
