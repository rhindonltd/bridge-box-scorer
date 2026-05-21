"use client";

import { useGame } from "@/context/GameContext";
import { getSocket } from "@/lib/socket";
import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import SimpleCreateGameForm from "@/components/create/SimpleCreateGameForm";
import { SocketEvents } from "@/socket/socket-events";

export function CreateGameFormPage() {
  const { selectGame } = useGame();

  function createGame(game: NewBridgeGame) {
    getSocket().emit(
      SocketEvents.CREATE_GAME,
      game,
      (response: { game: BridgeGame }) => {
        selectGame(response.game);
      },
    );
  }

  return <SimpleCreateGameForm onCreateGame={createGame} />;
}
