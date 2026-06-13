"use client";

import { NewBridgeGame } from "@/db/game-index/schema";
import SimpleCreateGameForm from "@/components/create/SimpleCreateGameForm";
import { useRouter } from "next/navigation";
import { createGame } from "@/lib/game-service";

export function CreateGamePage() {
  const router = useRouter();

  async function onCreateGame(game: NewBridgeGame) {
    router.replace(`/create/${(await createGame(game)).gameId}`);
  }

  return <SimpleCreateGameForm onCreateGame={onCreateGame} />;
}
