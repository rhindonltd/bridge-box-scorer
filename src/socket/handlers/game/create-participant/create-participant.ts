import { Server, Socket } from "socket.io";

import { SocketEvents } from "@/socket/socket-events";

import { createPlayer } from "@/db/games/actions/create-player";

import { createParticipant as createPair } from "@/db/games/actions/create-participant";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { findSeatedNationalIds } from "@/db/games/queries/find-seated-national-ids";

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
        const db = await getDb(gameId);

        if (!db) {
          throw new Error("Game db does not exist");
        }

        // A person (identified by EBU/national id) can only occupy one seat.
        // Guests (no national id) are never treated as duplicates. Reject a
        // duplicate BEFORE creating any player/participant rows so a rejected
        // submission leaves no orphaned players behind.
        const id1 = newParticipant.player1.nationalId ?? null;
        const id2 = newParticipant.player2.nationalId ?? null;

        if (id1 && id2 && id1 === id2) {
          cb({
            error: `The same EBU number (${id1}) can't be entered for both players.`,
            success: false,
          });
          return;
        }

        // Only hit the database when there's an EBU number to check against
        // existing seats — two guests can never clash.
        const incomingIds = [id1, id2].filter((id): id is string => !!id);
        if (incomingIds.length > 0) {
          const seated = await findSeatedNationalIds(db);
          const clash = incomingIds.find((id) => seated.has(id));
          if (clash) {
            cb({
              error: `A player with EBU number ${clash} is already seated in this event.`,
              success: false,
            });
            return;
          }
        }

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
