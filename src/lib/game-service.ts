import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck, emitEvent } from "@/lib/socket";
import { NewParticipant } from "@/model/participants";
import { setDirectorToken, getDirectorToken } from "@/lib/director-token";

export async function createGame(game: NewBridgeGame): Promise<BridgeGame> {
  const response = await emitWithAck<{
    success: boolean;
    game: BridgeGame;
    directorToken: string;
  }>(SocketEvents.CREATE_GAME, game);

  // Store the director token in localStorage keyed by gameId
  setDirectorToken(response.game.gameId, response.directorToken);

  return response.game;
}

export async function selectMovement(gameId: string, id: number, type: string) {
  emitEvent(SocketEvents.SELECT_MOVEMENT, {
    gameId,
    type,
    id,
    directorToken: getDirectorToken(gameId),
  });
}

export async function createParticipant(
  gameId: string,
  newParticipant: NewParticipant,
): Promise<string> {
  return (
    await emitWithAck<{ success: boolean; key: string }>(
      SocketEvents.CREATE_PARTICIPANT,
      { gameId, newParticipant, directorToken: getDirectorToken(gameId) },
    )
  ).key;
}
