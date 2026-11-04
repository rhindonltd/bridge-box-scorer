import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findClub } from "@/db/system/queries/find-club";
import { updateTournamentLevel } from "@/db/game-index/actions/update-tournament-level";
import {
  TournamentLevels,
  TournamentLevel,
} from "@/db/games/types/tournament-level";
import { generateUsebio } from "@/services/usebio-service";
import { withDirectorRoute } from "@/lib/api/directorRoute";

/**
 * GET /api/games/[gameId]/usebio?tournamentLevel=... — download this game's
 * USEBIO XML. Director-authed (GET downloads can't carry a body, so the EBU
 * tournament level comes in on the query string). The chosen level fixes the
 * masterpoint/charge EVENT fields and is saved back to the game so it pre-fills
 * next time.
 */
export const GET = withDirectorRoute(async ({ db, gameId, req }) => {
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

  const levelParam = new URL(req.url).searchParams.get("tournamentLevel");
  if (
    levelParam === null ||
    !(TournamentLevels as readonly string[]).includes(levelParam)
  ) {
    return NextResponse.json(
      { success: false, error: "Invalid or missing tournament level." },
      { status: 400 },
    );
  }
  const tournamentLevel = levelParam as TournamentLevel;

  const club = await findClub();

  if (!club) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Club info not configured. Set club name and number in settings.",
      },
      { status: 400 },
    );
  }

  // Persist the chosen level so it pre-fills the next export.
  await updateTournamentLevel(gameId, tournamentLevel);

  const xml = await generateUsebio(db, game, club, tournamentLevel);

  // Return as downloadable XML file
  const filename = `${game.eventName.replace(/[^a-zA-Z0-9]/g, "_")}_${game.eventDate.split("T")[0]}.xml`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
