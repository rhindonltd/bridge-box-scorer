"use client";

import { BridgeGame } from "@/db/game-index/schema";
import { fetcher } from "@/lib/fetcher";
import useSWR from "swr";
import { ManageGameList } from "./ManageGameList";

interface Props {
  onGameSelected: (gameId: string, gameName?: string) => void;
}

export default function ManageSelectGamePage({ onGameSelected }: Props) {
  const { data, isLoading } = useSWR<BridgeGame[]>("/api/games/all", fetcher);

  return (
    <ManageGameList
      games={data ?? []}
      isLoading={isLoading}
      onGameSelected={onGameSelected}
    />
  );
}
