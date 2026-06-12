import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck, emitEvent } from "@/lib/socket";

export async function createGame(game: NewBridgeGame) {
  const response = await emitWithAck<{
    success: boolean;
    game: BridgeGame;
  }>(SocketEvents.CREATE_GAME, game);

  return response.game;
}

export async function selectMovement(gameId: string, id: number, type: string) {
  emitEvent(SocketEvents.SELECT_MOVEMENT, { gameId, type, id });
}
