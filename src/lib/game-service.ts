import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck, emitEvent } from "@/lib/socket";
import { NewParticipant } from "@/model/participants";

export async function createGame(game: NewBridgeGame): Promise<BridgeGame> {
  return (
    await emitWithAck<{
      success: boolean;
      game: BridgeGame;
    }>(SocketEvents.CREATE_GAME, game)
  ).game;
}

export async function selectMovement(gameId: string, id: number, type: string) {
  emitEvent(SocketEvents.SELECT_MOVEMENT, { gameId, type, id });
}

export async function createParticipant(
  gameId: string,
  newParticipant: NewParticipant,
): Promise<string> {
  return (
    await emitWithAck<{ success: boolean; key: string }>(
      SocketEvents.CREATE_PARTICIPANT,
      { gameId, newParticipant },
    )
  ).key;
}
