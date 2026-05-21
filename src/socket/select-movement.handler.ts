import { Server, Socket } from "socket.io";
import { SocketEvents } from "./socket-events";

import {
  getIndividualMovement,
  IndividualMovement,
  PairMovement,
  TeamMovement,
  getPairMovement,
  getTeamMovement,
} from "@/db/movements/queries/get-movement";

import { createPairMovement } from "../db/games/pairs/actions/create-movement";
import { createIndividualMovement } from "../db/games/individual/actions/create-movement";
import { createBoardPlay } from "../db/games/shared/actions/create-board-play";
import { findPlayerForStartingPosition } from "../db/games/shared/queries/find-player-for-starting-position";
import { createIndividualPlayerMovementMapEntry } from "../db/games/individual/actions/create-player-movement-map-entry";
import { findPairForPlayerId } from "../db/games/pairs/queries/find-pair-for-player-id";
import { createPairMovementMapEntry } from "../db/games/pairs/actions/create-pair-movement-map-entry";

/**
 * Expand board ranges into individual board plays
 */
async function createBoardPlaysFromRounds(
  gameId: string,
  rounds: {
    roundNumber: number;
    tableNumber: number;
    boardStart: number;
    boardEnd: number;
  }[],
) {
  for (const r of rounds) {
    for (
      let boardNumber = r.boardStart;
      boardNumber <= r.boardEnd;
      boardNumber++
    ) {
      await createBoardPlay(gameId, {
        roundNumber: r.roundNumber,
        tableNumber: r.tableNumber,
        boardNumber,
        status: "NOT_PLAYED",
      });
    }
  }
}

/**
 * Normalize movement rounds for board play creation
 */
type NormalizedRound = {
  roundNumber: number;
  tableNumber: number;
  boardStart: number;
  boardEnd: number;
};

/**
 * Individual movement handler
 */
async function handleIndividualMovement(
  movement: IndividualMovement[],
  gameId: string,
): Promise<NormalizedRound[]> {
  const rounds: NormalizedRound[] = [];

  for (const m of movement) {
    for (const r of m.rounds) {
      await createIndividualMovement(gameId, {
        roundNumber: r.roundNumber,
        tableNumber: m.tableNumber,
        n: r.n,
        s: r.s,
        e: r.e,
        w: r.w,
        boardStart: r.boardStart,
        boardEnd: r.boardEnd,
      });

      rounds.push({
        roundNumber: r.roundNumber,
        tableNumber: m.tableNumber,
        boardStart: r.boardStart,
        boardEnd: r.boardEnd,
      });

      if (r.roundNumber === 1) {
        const seats = [
          { position: "N", movementId: r.n },
          { position: "S", movementId: r.s },
          { position: "E", movementId: r.e },
          { position: "W", movementId: r.w },
        ] as const;

        for (const { position, movementId } of seats) {
          const player = await findPlayerForStartingPosition(
            gameId,
            m.tableNumber,
            position,
          );

          if (player) {
            await createIndividualPlayerMovementMapEntry(gameId, {
              id: movementId,
              player,
            });
          }
        }
      }
    }
  }

  return rounds;
}

/**
 * Pair + Team movement handler (same structure)
 */
async function handlePairLikeMovement(
  movement: PairMovement[] | TeamMovement[],
  gameId: string,
): Promise<NormalizedRound[]> {
  const rounds: NormalizedRound[] = [];

  for (const m of movement) {
    for (const r of m.rounds) {
      await createPairMovement(gameId, {
        roundNumber: r.roundNumber,
        tableNumber: m.tableNumber,
        ns: r.ns,
        ew: r.ew,
        boardStart: r.boardStart,
        boardEnd: r.boardEnd,
      });

      rounds.push({
        roundNumber: r.roundNumber,
        tableNumber: m.tableNumber,
        boardStart: r.boardStart,
        boardEnd: r.boardEnd,
      });

      if (r.roundNumber === 1) {
        const nPlayer = await findPlayerForStartingPosition(
          gameId,
          m.tableNumber,
          "N",
        );

        if (nPlayer) {
          const nsPair = await findPairForPlayerId(gameId, nPlayer);

          if (nsPair) {
            await createPairMovementMapEntry(gameId, {
              id: r.ns,
              pair: nsPair,
            });
          }
        }

        const ePlayer = await findPlayerForStartingPosition(
          gameId,
          m.tableNumber,
          "E",
        );

        if (ePlayer) {
          const ewPair = await findPairForPlayerId(gameId, ePlayer);

          if (ewPair) {
            await createPairMovementMapEntry(gameId, {
              id: r.ew,
              pair: ewPair,
            });
          }
        }
      }
    }
  }

  return rounds;
}

/**
 * Socket handler
 */
export function registerSelectedMovementHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.SELECT_MOVEMENT,
    async (
      {
        gameId,
        type,
        id,
      }: {
        gameId: string;
        type: string;
        id: number;
      },
      cb,
    ) => {
      try {
        let rounds: NormalizedRound[] = [];

        if (type === "INDIVIDUAL") {
          const movement = await getIndividualMovement(id);
          rounds = await handleIndividualMovement(movement, gameId);
        } else if (type === "PAIRS") {
          const movement = await getPairMovement(id);
          rounds = await handlePairLikeMovement(movement, gameId);
        } else {
          const movement = await getTeamMovement(id);
          rounds = await handlePairLikeMovement(movement, gameId);
        }

        await createBoardPlaysFromRounds(gameId, rounds);

        cb?.({ success: true });
      } catch (err) {
        console.error(err);
        cb?.({ success: false });
      }
    },
  );
}
