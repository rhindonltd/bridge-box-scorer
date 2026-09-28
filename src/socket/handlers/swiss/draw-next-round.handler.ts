import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import {
  previewNextSwissRound,
  commitNextSwissRound,
} from "@/services/draw-swiss-round-service";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import type { NamedSeating } from "@/services/swiss-seating-names";
import type { SerializableAdvisoryInputs } from "@/movement/swiss/swiss-pairing";

/** A single table's seating as pair ids (the shape echoed back on commit). */
const seatingSchema = z.array(
  z.object({
    tableNumber: z.number().int().min(1),
    ns: z.number().int().min(1),
    ew: z.number().int().min(1),
  }),
);

const previewPayloadSchema = z.object({
  gameId: z.string().min(1),
  section: z.string().min(1),
  directorToken: z.string().min(1),
});

const commitPayloadSchema = previewPayloadSchema.extend({
  // The exact seating to commit — the previewed draw, possibly edited by the
  // director (swapped pairs / reassigned bye).
  seating: seatingSchema,
  sitOutPairId: z.number().int().min(1).nullable(),
});

type PreviewPayload = z.infer<typeof previewPayloadSchema>;
type CommitPayload = z.infer<typeof commitPayloadSchema>;

/** What a preview reports back to the director's device. */
interface PreviewAck {
  roundNumber: number;
  tables: number;
  seating: { tableNumber: number; ns: number; ew: number }[];
  sitOutPairId: number | null;
  named: NamedSeating;
  advisoryInputs: SerializableAdvisoryInputs;
  hadUnavoidableRepeat: boolean;
  hadStationaryConflict: boolean;
}

/** What a commit reports back to the director's device. */
interface CommitAck {
  roundNumber: number;
}

/** Human-facing messages for the reasons a draw can be refused. */
const REJECTION_MESSAGE: Record<string, string> = {
  NOT_SWISS: "This section is not a Swiss Pairs movement.",
  ROUND_INCOMPLETE:
    "All results for the current round must be in before drawing the next round.",
  EVENT_COMPLETE: "All rounds have already been drawn.",
  INVALID_SEATING:
    "That seating isn't valid — every pair must be seated exactly once.",
};

/**
 * Director-only handler for PREVIEWING the next Swiss Pairs round.
 *
 * Validates the director token, then computes the proposed round WITHOUT
 * writing or broadcasting. The acknowledgement carries the seating (stable pair
 * ids + resolved player names), the sit-out pair and the advisories so the
 * director can review and edit it before committing.
 */
export function registerPreviewNextRoundHandler(socket: Socket, io: Server) {
  registerHandler<PreviewPayload, PreviewAck>(
    socket,
    io,
    SocketEvents.PREVIEW_NEXT_SWISS_ROUND,
    {
      schema: previewPayloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, section, directorToken } = payload;

        if (!validateDirectorToken(directorToken, gameId)) {
          throw new HandlerError("Unauthorized");
        }

        const result = await previewNextSwissRound(gameId, section);

        if (!result.ok) {
          throw new HandlerError(
            REJECTION_MESSAGE[result.reason] ??
              "Could not draw the next round.",
          );
        }

        ack({
          success: true,
          data: {
            roundNumber: result.roundNumber,
            tables: result.tables,
            seating: result.seating,
            sitOutPairId: result.sitOutPairId,
            named: result.named,
            advisoryInputs: result.advisoryInputs,
            hadUnavoidableRepeat: result.hadUnavoidableRepeat,
            hadStationaryConflict: result.hadStationaryConflict,
          },
        });
      },
    },
  );
}

/**
 * Director-only handler for COMMITTING the next Swiss Pairs round.
 *
 * Validates the director token, then materializes the EXACT seating the
 * director accepted — which may differ from a fresh draw because they swapped
 * pairs or reassigned the bye on the preview. Structural invalidity is rejected
 * (INVALID_SEATING); advisory issues (a repeat, a stationary conflict) are the
 * director's call and are committed as-is.
 *
 * On success it fans out the live updates: a `GAME_UPDATED` to the game room so
 * every device re-reads its schedule for the new round, and a fresh leaderboard
 * snapshot to the leaderboard room when occupied.
 */
export function registerDrawNextRoundHandler(socket: Socket, io: Server) {
  registerHandler<CommitPayload, CommitAck>(
    socket,
    io,
    SocketEvents.DRAW_NEXT_SWISS_ROUND,
    {
      schema: commitPayloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, section, directorToken, seating, sitOutPairId } =
          payload;

        if (!validateDirectorToken(directorToken, gameId)) {
          throw new HandlerError("Unauthorized");
        }

        const result = await commitNextSwissRound(
          gameId,
          section,
          seating,
          sitOutPairId,
        );

        if (!result.ok) {
          throw new HandlerError(
            REJECTION_MESSAGE[result.reason] ??
              "Could not draw the next round.",
          );
        }

        // Notify the whole game room so player/display schedules refresh into
        // the newly-drawn round.
        const game = await findGameById(gameId);
        io.to(Rooms.game(gameId)).emit(SocketEvents.GAME_UPDATED, { game });

        // Push a fresh leaderboard snapshot to viewers (occupancy-gated).
        await broadcastLeaderboardChanged(io, gameId);

        ack({ success: true, data: { roundNumber: result.roundNumber } });
      },
    },
  );
}
