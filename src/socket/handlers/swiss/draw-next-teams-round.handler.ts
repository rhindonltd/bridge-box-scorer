import { Server, Socket } from "socket.io";
import { z } from "zod";

import { SocketEvents } from "@/socket/socket-events";
import { Rooms } from "@/socket/rooms";
import { registerHandler, HandlerError } from "@/socket/handlers/handler-wrapper";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import {
  previewNextSwissTeamsRound,
  commitNextSwissTeamsRound,
} from "@/services/draw-swiss-teams-round-service";
import { broadcastLeaderboardChanged } from "@/socket/handlers/results/broadcast-results";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import type { NamedTeamsSeating } from "@/services/swiss-teams-seating-names";

const matchesSchema = z.array(
  z.object({ a: z.number().int().min(1), b: z.number().int().min(1) }),
);
const triangleSchema = z
  .object({
    a: z.number().int().min(1),
    b: z.number().int().min(1),
    c: z.number().int().min(1),
  })
  .nullable();

const previewPayloadSchema = z.object({
  gameId: z.string().min(1),
  section: z.string().min(1),
  directorToken: z.string().min(1),
});

const commitPayloadSchema = previewPayloadSchema.extend({
  // The exact round to commit — the previewed draw (editing is a later step).
  matches: matchesSchema,
  byeTeamId: z.number().int().min(1).nullable(),
  triangle: triangleSchema,
});

type PreviewPayload = z.infer<typeof previewPayloadSchema>;
type CommitPayload = z.infer<typeof commitPayloadSchema>;

/** What a preview reports back to the director's device. */
interface PreviewAck {
  roundNumber: number;
  teams: number;
  matches: { a: number; b: number }[];
  byeTeamId: number | null;
  triangle: { a: number; b: number; c: number } | null;
  named: NamedTeamsSeating;
  hadUnavoidableRepeat: boolean;
}

/** What a commit reports back to the director's device. */
interface CommitAck {
  roundNumber: number;
}

/** Human-facing messages for the reasons a draw can be refused. */
const REJECTION_MESSAGE: Record<string, string> = {
  NOT_SWISS_TEAMS: "This section is not a Swiss Teams movement.",
  ROUND_INCOMPLETE:
    "All results for the current round must be in before drawing the next round.",
  EVENT_COMPLETE: "All rounds have already been drawn.",
  ODD_TEAM_COUNT:
    "A three-way triangle needs at least three teams — add a table, or switch this event to the bye option.",
  INVALID_MATCHES:
    "That round isn't valid — every team must be placed exactly once.",
};

/**
 * Director-only handler for PREVIEWING the next Swiss Teams round.
 *
 * Validates the director token, then computes the proposed round WITHOUT
 * writing or broadcasting. The acknowledgement carries the matches (stable team
 * ids + resolved team names), the odd-field resolution (bye or triangle) and
 * the repeat advisory so the director can review it before committing.
 */
export function registerPreviewNextTeamsRoundHandler(
  socket: Socket,
  io: Server,
) {
  registerHandler<PreviewPayload, PreviewAck>(
    socket,
    io,
    SocketEvents.PREVIEW_NEXT_SWISS_TEAMS_ROUND,
    {
      schema: previewPayloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, section, directorToken } = payload;

        if (!validateDirectorToken(directorToken, gameId)) {
          throw new HandlerError("Unauthorized");
        }

        const result = await previewNextSwissTeamsRound(gameId, section);

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
            teams: result.teams,
            matches: result.matches,
            byeTeamId: result.byeTeamId,
            triangle: result.triangle,
            named: result.named,
            hadUnavoidableRepeat: result.hadUnavoidableRepeat,
          },
        });
      },
    },
  );
}

/**
 * Director-only handler for COMMITTING the next Swiss Teams round.
 *
 * Validates the director token, then materializes the EXACT round the director
 * accepted. Structural invalidity is rejected (INVALID_MATCHES). On success it
 * fans out the live updates: a `GAME_UPDATED` to the game room so every device
 * re-reads its schedule for the new round (each team's away pair learns where
 * it is moving), and a fresh leaderboard snapshot to the leaderboard room when
 * occupied.
 */
export function registerDrawNextTeamsRoundHandler(socket: Socket, io: Server) {
  registerHandler<CommitPayload, CommitAck>(
    socket,
    io,
    SocketEvents.DRAW_NEXT_SWISS_TEAMS_ROUND,
    {
      schema: commitPayloadSchema,
      handler: async ({ payload, ack }) => {
        const { gameId, section, directorToken, matches, byeTeamId, triangle } =
          payload;

        if (!validateDirectorToken(directorToken, gameId)) {
          throw new HandlerError("Unauthorized");
        }

        const result = await commitNextSwissTeamsRound(
          gameId,
          section,
          matches,
          byeTeamId,
          triangle,
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
