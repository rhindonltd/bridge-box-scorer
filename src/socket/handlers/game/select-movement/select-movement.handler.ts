import { Socket } from "socket.io";
import { SocketEvents } from "@/socket/socket-events";

import {
  getIndividualMovement,
  IndividualMovement,
  PairMovement,
  TeamMovement,
  getPairMovement,
  getTeamMovement,
} from "@/db/movements/queries/get-movement";

import { createBoard as createIndividualBoard } from "@/db/games/individual/actions/create-board";
import { createBoard as createPairBoard } from "@/db/games/pairs/actions/create-board";

import { createAssignment as createIndividualAssignment } from "@/db/games/individual/actions/create-assignment";
import { createAssignment as createPairAssignment } from "@/db/games/pairs/actions/create-assignment";

/**
 * Individual movement handler
 */
async function handleIndividualMovement(
  movement: IndividualMovement[],
  gameId: string,
) {
  for (const m of movement) {
    for (const r of m.rounds) {
      for (
        let boardNumber = r.boardStart;
        boardNumber <= r.boardEnd;
        boardNumber++
      ) {
        await createIndividualBoard(gameId, {
          roundNumber: r.roundNumber,
          tableNumber: m.tableNumber,
          boardNumber,
          n: r.n,
          s: r.s,
          e: r.e,
          w: r.w,
          status: "NOT_PLAYED",
        });
      }

      if (r.roundNumber === 1) {
        const seats = [
          { position: "N", movementId: r.n },
          { position: "S", movementId: r.s },
          { position: "E", movementId: r.e },
          { position: "W", movementId: r.w },
        ] as const;

        for (const { position, movementId } of seats) {
          await createIndividualAssignment(gameId, {
            id: movementId,
            initialSeat: `${m.tableNumber}${position}`,
          });
        }
      }
    }
  }
}

/**
 * Pair + Team movement handler (same structure)
 */
async function handlePairLikeMovement(
  movement: PairMovement[] | TeamMovement[],
  gameId: string,
) {
  for (const m of movement) {
    for (const r of m.rounds) {
      for (
        let boardNumber = r.boardStart;
        boardNumber <= r.boardEnd;
        boardNumber++
      ) {
        await createPairBoard(gameId, {
          roundNumber: r.roundNumber,
          tableNumber: m.tableNumber,
          boardNumber,
          ns: r.ns,
          ew: r.ew,
          status: "NOT_PLAYED",
        });
      }

      if (r.roundNumber === 1) {
        const seats = [
          { position: "NS", movementId: r.ns },
          { position: "EW", movementId: r.ew },
        ] as const;

        for (const { position, movementId } of seats) {
          await createPairAssignment(gameId, {
            id: movementId,
            initialSeat: `${m.tableNumber}${position}`,
          });
        }
      }
    }
  }
}

/**
 * Socket handler
 */
export function registerSelectMovementHandler(socket: Socket) {
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
        if (type === "INDIVIDUAL") {
          await handleIndividualMovement(
            await getIndividualMovement(id),
            gameId,
          );
        } else if (type === "PAIRS") {
          await handlePairLikeMovement(await getPairMovement(id), gameId);
        } else {
          await handlePairLikeMovement(await getTeamMovement(id), gameId);
        }

        cb?.({ success: true });
      } catch (err) {
        console.error(err);
        cb?.({ success: false });
      }
    },
  );
}
