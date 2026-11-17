import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findClub } from "@/db/system/queries/find-club";
import { DEFAULT_TOURNAMENT_LEVEL } from "@/model/tournament-level";
import { generateUsebio } from "@/services/usebio-service";
import { withGameRoute } from "@/lib/api/gameRoute";
import { requireFinalisedGuard } from "@/lib/api/finalised-guard";

/**
 * GET /api/games/[gameId]/usebio — download this game's USEBIO XML. Open to
 * anyone (players included) once the director has finalised the game; 403
 * before that. The EBU tournament level (which fixes the masterpoint/charge
 * EVENT fields) is the one SAVED on the game: only a director can change it,
 * and downloading never writes anything.
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

  const xml = await generateUsebio(
    db,
    game,
    club,
    game.tournamentLevel ?? DEFAULT_TOURNAMENT_LEVEL,
  );

  // Return as downloadable XML file
  const filename = `${game.eventName.replace(/[^a-zA-Z0-9]/g, "_")}_${game.eventDate.split("T")[0]}.xml`;
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
