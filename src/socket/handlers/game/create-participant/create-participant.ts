import { Server, Socket } from "socket.io";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

import { createPlayer } from "@/db/games/shared/actions/create-player";

import { createParticipant as createIndividual } from "@/db/games/individual/actions/create-participant";
import { findIndividuals } from "@/db/games/individual/queries/find-individuals";

import { createParticipant as createPair } from "@/db/games/pairs/actions/create-participant";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";

import { Participant } from "@/model/participants";

export function registerSelectSeatHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_PARTICIPANT,
    async (
      {
        gameId,
        participant,
      }: {
        gameId: string;
        participant: Participant;
      },
      cb,
    ) => {
      try {
        const key = crypto.randomUUID();

        if (participant.type == "INDIVIDUAL") {
          const playerId = (
            await createPlayer("INDIVIDUAL", gameId, participant.player)
          ).id;

          await createIndividual(gameId, {
            initialSeat: participant.initialSeat,
            player: playerId,
            secretKey: key,
          });

          io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
            startingPositions: await findIndividuals(gameId),
          });

          cb?.({ success: true, key });
        } else if (participant.type == "PAIR") {
          // PAIR
          const player1 = (
            await createPlayer("PAIRS", gameId, participant.player1)
          ).id;
          const player2 = (
            await createPlayer("PAIRS", gameId, participant.player2)
          ).id;

          await createPair(gameId, {
            initialSeat: participant.initialSeat,
            player1,
            player2,
            secretKey: key,
          });

          io.to(Rooms.game(gameId)).emit(SocketEvents.STARTING_POSITIONS, {
            startingPositions: await findPairs(gameId),
          });

          cb?.({ success: true, key });
        }
      } catch (err) {
        console.error(`Failed to create participant for game ${gameId}`, err);

        cb?.({
          success: false,
        });
      }
    },
  );
}
