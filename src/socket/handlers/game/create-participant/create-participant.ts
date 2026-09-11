import { Server, Socket } from "socket.io";

import { SocketEvents } from "@/socket/socket-events";

import { createPlayer } from "@/db/games/actions/create-player";

import { createParticipant as createPair } from "@/db/games/actions/create-participant";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";

import { NewParticipant } from "@/model/participants";
import { getDb } from "@/db/games";

export function registerCreateParticipantHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_PARTICIPANT,
    async (
      {
        gameId,
        newParticipant,
      }: {
        gameId: string;
        newParticipant: NewParticipant;
      },
      cb,
    ) => {
      try {
        const key = crypto.randomUUID();

        // PAIR
        const player1 = (await createPlayer(gameId, newParticipant.player1)).id;
        const player2 = (await createPlayer(gameId, newParticipant.player2)).id;

        await createPair(gameId, {
          initialSeat: newParticipant.initialSeat,
          player1,
          player2,
          secretKey: key,
        });

        const db = await getDb(gameId);

        if (!db) {
          throw new Error("Game db does not exist");
        }

        await broadcastParticipants(gameId, io);
        cb({
          data: { key },
          success: true,
        });
      } catch (err) {
        console.error(`Failed to create participant for game ${gameId}`, err);
        cb({
          error: err instanceof Error ? err.message : "Unknown error",
          success: false,
        });
      }
    },
  );
}
