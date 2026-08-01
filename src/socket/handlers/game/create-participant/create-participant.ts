import { Server, Socket } from "socket.io";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";

import { createPlayer } from "@/db/games/shared/actions/create-player";

import { createParticipant as createPair } from "@/db/games/pairs/actions/create-participant";
import { findPairs } from "@/db/games/pairs/queries/find-pairs";

import { NewParticipant } from "@/model/participants";
import { assertDirector } from "@/socket/middleware/director-auth";

export function registerCreateParticipantHandler(socket: Socket, io: Server) {
  socket.on(
    SocketEvents.CREATE_PARTICIPANT,
    async (
      {
        gameId,
        newParticipant,
        directorToken,
      }: {
        gameId: string;
        newParticipant: NewParticipant;
        directorToken?: string;
      },
      cb,
    ) => {
      if (!assertDirector(directorToken, gameId, cb)) return;
      try {
        const key = crypto.randomUUID();

        // PAIR
        const player1 = (
          await createPlayer("PAIRS", gameId, newParticipant.player1)
        ).id;
        const player2 = (
          await createPlayer("PAIRS", gameId, newParticipant.player2)
        ).id;

        await createPair(gameId, {
          initialSeat: newParticipant.initialSeat,
          player1,
          player2,
          secretKey: key,
        });

        io.to(Rooms.game(gameId)).emit(SocketEvents.PARTICIPANTS, {
          participants: await findPairs(gameId),
        });

        cb?.({ success: true, key });
      } catch (err) {
        console.error(`Failed to create participant for game ${gameId}`, err);
        cb?.({ success: false });
      }
    },
  );
}
