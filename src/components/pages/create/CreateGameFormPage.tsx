"use client";

import { useGame } from "@/context/GameContext";
import { getSocket } from "@/lib/socket";
import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import SimpleCreateGameForm from "@/components/create/SimpleCreateGameForm";

export function CreateGameFormPage() {
  const { selectGame } = useGame();

  function createGame(game: NewBridgeGame) {
    getSocket().emit("game:create", game, (response: { game: BridgeGame }) => {
      console.log("Game: " + response.game);
      selectGame(response.game);
    });
  }

  return <SimpleCreateGameForm onCreateGame={createGame} />;
}
