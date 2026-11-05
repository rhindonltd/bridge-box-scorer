import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";

import { createPairWithPlayers } from "@/db/games/actions/create-pair-with-players";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { findSeatedNationalIds } from "@/db/games/queries/find-seated-national-ids";
import { findSections } from "@/db/games/queries/find-sections";

import { NewParticipant } from "@/model/participants";
import { isSeatInSections } from "@/model/section";
import { getDb } from "@/db/games";
import {
  registerHandler,
  HandlerError,
} from "@/socket/handlers/handler-wrapper";
import { isGameStarted } from "@/db/games/queries/is-game-started";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { recordLateArrival } from "@/db/games/actions/record-late-arrival";
import { Rooms } from "@/socket/rooms";

// `newParticipant` carries a nested player/seat structure validated by the
// domain model; keep it as a passthrough here and rely on the typed shape.
// `teamName` is an optional Teams-event extra: the home (NS) pair may name
// their team. It is a sibling of the pair rather than part of `NewParticipant`
// (which stays a pure pair shape); the DB action ignores it for non-NS seats.
const payloadSchema = z.object({
  gameId: z.string().min(1),
  newParticipant: z.custom<NewParticipant>(),
  teamName: z.string().optional(),
});

export function registerCreateParticipantHandler(socket: Socket, io: Server) {
  registerHandler<z.infer<typeof payloadSchema>, { key: string }>(
    socket,
    io,
    SocketEvents.CREATE_PARTICIPANT,
    {
      schema: payloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, newParticipant, teamName } = payload;

        const db = await getDb(gameId);

        if (!db) {
          throw new Error("Game db does not exist");
        }

        // The seat must name a real table in the CURRENT layout. A device can
        // hold a seat that was valid when it was picked but has since been
        // invalidated — most notably a section split that renumbered/shrank the
        // section out from under the chosen table. Seating there would create a
        // ghost pair outside the layout, so reject it and let the client prompt
        // for a fresh pick. This is the authoritative guard; the client also
        // reconciles the open sheet for a smoother UX.
        const sections = await findSections(db);
        if (!isSeatInSections(newParticipant.initialSeat, sections)) {
          throw new HandlerError(
            "That table is no longer available — the sections were just reorganised. Please pick a seat again.",
          );
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
          teamName,
        });

        // Design §11: a pairs pair seated AFTER the start in an expected-late
        // seat is a late arrival — it joins at the round the room is on, and
        // the boards it missed are marked ABSENT. Tell every device its
        // schedule changed so the late pair's opponents are moved on.
        if (await isGameStarted(gameId)) {
          const game = await findGameById(gameId);
          if (game?.gameType === "PAIRS" && game.eventFormat !== "SWISS") {
            const arrival = await recordLateArrival(
              gameId,
              newParticipant.initialSeat,
            );
            if (arrival.late) {
              io.to(Rooms.game(gameId)).emit(SocketEvents.SCHEDULE_CHANGED, {
                gameId,
              });
              io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, {
                game,
              });
            }
          }
        }

        await broadcastParticipants(gameId, io);
        // The leaderboard lists the whole seated field from the start (everyone
        // at a level starting score before any board is played), so a newly
        // seated pair must appear on it live — not only after a refresh. Push a
        // fresh snapshot to the leaderboard room (occupancy-gated inside), the
        // same recompute every other standings-affecting change triggers.
        await broadcastLeaderboardChanged(io, gameId);
        ack({ success: true, data: { key } });
      },
    },
  );
}
