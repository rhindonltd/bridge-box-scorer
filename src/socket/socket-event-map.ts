import { BridgeGame } from "@/db/game-index/schema";
import { Participant, Seat } from "@/model/participants";
import { SocketEvents } from "@/socket/socket-events";

export type SocketEventMap = {
  [SocketEvents.PARTICIPANTS]: {
    participants: Participant[];
  };

  [SocketEvents.SELECT_MOVEMENT]: {
    gameId: string;
    id: number;
    type: string;
  };

  [SocketEvents.JOINABLE_GAMES]: {
    joinableGames: BridgeGame[];
  };

  [SocketEvents.GAME_UPDATED]: {
    game: BridgeGame;
  };
};
