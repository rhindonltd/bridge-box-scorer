import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { findClub } from "@/db/system/queries/find-club";
import { generateUsebio } from "@/services/usebio-service";
import { withDirectorRoute } from "@/lib/api/directorRoute";

export const GET = withDirectorRoute(async ({ db, gameId }) => {
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

  const xml = await generateUsebio(db, game, club);

  // Return as downloadable XML file
  const filename = `${game.eventName.replace(/[^a-zA-Z0-9]/g, "_")}_${game.eventDate.split("T")[0]}.xml`;

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
