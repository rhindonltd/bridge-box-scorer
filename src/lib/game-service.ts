import { BridgeGame, NewBridgeGame } from "@/db/game-index/schema";
import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck, emitEvent } from "@/lib/socket";
import { NewParticipant } from "@/model/participants";
import { setDirectorToken, getDirectorToken } from "@/lib/director-token";
import { setPlayerToken } from "./player-token";
import { MitchellMovementSpec } from "@/movement/mitchell/mitchell-utils";

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

export async function selectMitchellMovement(
  gameId: string,
  mitchell: MitchellMovementSpec,
) {
  emitEvent(SocketEvents.SELECT_MOVEMENT, {
    gameId,
    type: "PAIRS",
    mitchell,
    directorToken: getDirectorToken(gameId),
  });
}

export async function startGame(gameId: string): Promise<void> {
  await emitWithAck(SocketEvents.START_GAME, {
    gameId,
    directorToken: getDirectorToken(gameId),
  });
}

export async function createParticipant(
  gameId: string,
  newParticipant: NewParticipant,
) {
  const response = await emitWithAck<{ success: boolean; key: string }>(
    SocketEvents.CREATE_PARTICIPANT,
    { gameId, newParticipant },
  );

  setPlayerToken(gameId, {
    startingPosition: newParticipant.initialSeat,
    token: response.key,
  });
}
