import { BridgeGame } from "@/db/game-index/schema";
import { PlayerInitialSeat } from "@/db/games/shared/queries/find-player-initial-seats";
import { SocketEvents } from "@/socket/socket-events";

export type SocketEventMap = {
  [SocketEvents.STARTING_POSITIONS]: {
    startingPositions: PlayerInitialSeat[];
  };

  [SocketEvents.SELECT_MOVEMENT]: {
    gameId: string;
    id: number;
    type: string;
  };

  [SocketEvents.JOINABLE_GAMES]: {
    joinableGames: BridgeGame[];
  };
};
