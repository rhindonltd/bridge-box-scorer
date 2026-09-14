import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";

import { createPairWithPlayers } from "@/db/games/actions/create-pair-with-players";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { findSeatedNationalIds } from "@/db/games/queries/find-seated-national-ids";

import { NewParticipant } from "@/model/participants";
import { getDb } from "@/db/games";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";

// `newParticipant` carries a nested player/seat structure validated by the
// domain model; keep it as a passthrough here and rely on the typed shape.
const payloadSchema = z.object({
  gameId: z.string().min(1),
  newParticipant: z.custom<NewParticipant>(),
});

export function registerCreateParticipantHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, { key: string }>(
    socket,
    io,
    SocketEvents.CREATE_PARTICIPANT,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, newParticipant } = payload;

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
          throw new HandlerError(
            `The same EBU number (${id1}) can't be entered for both players.`,
          );
        }

        // Only hit the database when there's an EBU number to check against
        // existing seats — two guests can never clash.
        const incomingIds = [id1, id2].filter((id): id is string => !!id);
        if (incomingIds.length > 0) {
          const seated = await findSeatedNationalIds(db);
          const clash = incomingIds.find((id) => seated.has(id));
          if (clash) {
            throw new HandlerError(
              `A player with EBU number ${clash} is already seated in this event.`,
            );
          }
        }

        const key = crypto.randomUUID();

        // Create both player rows and the pair in one transaction so a failure
        // can't leave orphaned player rows behind.
        await createPairWithPlayers(gameId, {
          initialSeat: newParticipant.initialSeat,
          player1: newParticipant.player1,
          player2: newParticipant.player2,
          secretKey: key,
        });

        await broadcastParticipants(gameId, io);
        ack({ success: true, data: { key } });
      },
    },
  );
}
