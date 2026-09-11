import { z } from "zod";

import { withBasicRoute } from "@/lib/api/basicRoute";
import { ClientError, respondToActionError } from "@/lib/api/client-error";
import { GameTypes } from "@/db/games/types/game-type";
import { ScoringTypes } from "@/db/games/types/scoring-type";
import { createBridgeGame } from "@/db/game-index/actions/create-game";
import { createGameDb } from "@/db/games/actions/create-game";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { broadcastJoinableGames } from "@/socket/broadcast/joinable-broadcast";
import { NextResponse } from "next/server";

const bodySchema = z.object({
  eventName: z.string().min(1),
  director: z.string().nullish(),
  gameType: z.enum(GameTypes),
  scoringType: z.enum(ScoringTypes).optional(),
  sessionName: z.string(),
  sectionName: z.string(),
  eventDate: z.string().min(1),
  tables: z.number().int().min(1),
  leadCardRequired: z.boolean().optional(),
});

/**
 * POST /api/games — create a new game. No auth: anyone can create a game and
 * automatically becomes its director. Provisions the per-game database, creates
 * a director login session, and returns the game plus the director token (which
 * the client stores). Broadcasts the updated joinable-games list to all
 * clients. Returns 201 Created.
 */
export const POST = withBasicRoute(async ({ req }) => {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));

  try {
    if (!parsed.success) {
      throw new ClientError("Invalid game details");
    }

    const bridgeGame = await createBridgeGame(parsed.data);
    await createGameDb(bridgeGame.gameId, bridgeGame.tables);

    // The creator automatically becomes the director for this game.
    const directorToken = crypto.randomUUID();
    await createLoginSession({
      token: directorToken,
      gameId: bridgeGame.gameId,
      role: "DIRECTOR",
    });

    await broadcastJoinableGames();

    return NextResponse.json(
      { success: true, result: { game: bridgeGame, directorToken } },
      { status: 201 },
    );
  } catch (err) {
    return respondToActionError(err, "Failed to create game:");
  }
});
