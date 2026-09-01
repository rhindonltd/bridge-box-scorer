import { BridgeGame } from "@/db/game-index/schema";
import { Participant } from "@/model/participants";
import { SocketEvents } from "@/socket/socket-events";

export type SocketEventMap = {
  [SocketEvents.PARTICIPANTS]: {
    participants: Participant[];
  };

  [SocketEvents.SELECT_MOVEMENT]: {
    gameId: string;
    id?: number;
    type: string;
    mitchell?: {
      tables: number;
      rounds: number;
      boardsPerRound: number;
      arrowSwitchRounds?: number;
      skip?: boolean;
      shareAndRelay?: boolean;
    };
  };

  [SocketEvents.START_GAME]: {
    gameId: string;
    directorToken: string;
  };

  [SocketEvents.JOINABLE_GAMES]: {
    joinableGames: BridgeGame[];
  };

  [SocketEvents.GAME_UPDATED]: {
    game: BridgeGame;
  };

  [SocketEvents.BOARD_RESULT_UPDATED]: {
    gameId: string;
    roundNumber: number;
    tableNumber: number;
    boardNumber: number;
  };

  [SocketEvents.SUBMIT_RESULT]: {
    gameId: string;
    gameType: string;
    seat: string;
    roundNumber: number;
    tableNumber: number;
    boardNumber: number;
    result: string;
  };

  [SocketEvents.BOARD_CONFIRMED]: {
    gameId: string;
    roundNumber: number;
    tableNumber: number;
    boardNumber: number;
    result: string;
  };

  [SocketEvents.BOARD_MISMATCH]: {
    gameId: string;
    roundNumber: number;
    tableNumber: number;
    nsBoardNumber: number;
    nsResult: string;
    ewBoardNumber: number;
    ewResult: string;
  };
};
