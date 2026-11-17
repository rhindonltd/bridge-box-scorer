import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findClub } from "@/db/system/queries/find-club";
import { generatePbnExport } from "@/services/pbn-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { requireFinalisedGuard } from "@/lib/api/finalised-guard";

/**
 * GET /api/games/[gameId]/pbn — download the entered deals as a PBN file.
 * Open to anyone (players included) once the director has finalised the game;
 * 403 before that.
 */
export const GET = withGameRoute(async ({ db, gameId }) => {
  const game = await findGameById(gameId);
  if (!game) {
    return NextResponse.json(
      {
        success: false,
        error: "Game not found.",
      },
      { status: 404 },
    );
  }

  const notFinalised = await requireFinalisedGuard(gameId);
  if (notFinalised) return notFinalised;

  const club = await findClub();
  if (!club) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Club info not configured. Set the club name and EBU number in Settings → EBU.",
      },
      { status: 400 },
    );
  }

  const pbn = await generatePbnExport(db, game, club);

  // Return as a downloadable .pbn file.
  const filename = `${game.eventName.replace(/[^a-zA-Z0-9]/g, "_")}_${game.eventDate.split("T")[0]}.pbn`;
  return new NextResponse(pbn, {
    headers: {
      "Content-Type": "application/x-pbn",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
