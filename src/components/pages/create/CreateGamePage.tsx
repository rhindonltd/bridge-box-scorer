"use client";

import { NewBridgeGame } from "@/db/game-index/schema";
import SimpleCreateGameForm from "@/components/create/SimpleCreateGameForm";
import { useRouter } from "next/navigation";
import { createGame } from "@/lib/game-service";

export function CreateGamePage() {
  const router = useRouter();

  async function onCreateGame(game: NewBridgeGame) {
    try {
      const created = await createGame(game);
      router.replace(`/create/${created.gameId}`);
    } catch (err) {
      console.error("Failed to create game:", err);
      alert("Failed to create game. Please try again.");
    }
  }

  return <SimpleCreateGameForm onCreateGame={onCreateGame} />;
}
