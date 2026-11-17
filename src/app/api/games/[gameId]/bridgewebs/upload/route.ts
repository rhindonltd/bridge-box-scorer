import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { DEFAULT_TOURNAMENT_LEVEL } from "@/model/tournament-level";
import { requireFinalisedGuard } from "@/lib/api/finalised-guard";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { uploadResultsToBridgewebs } from "@/services/bridgewebs-upload-service";

/**
 * POST /api/games/[gameId]/bridgewebs/upload — upload this game's results to
 * BridgeWebs. Director-authed, and only once the director has finalised the
 * game (403 before that). The EBU level is the one saved on the game (a
 * director sets it on the export page); an upload never changes it. Returns the parsed
 * BridgeWebs status message so the UI can show it inline. Missing prerequisites
 * (club info / credentials) return 400 with a helpful message; a transport
 * failure returns 502.
 */
export const POST = withDirectorRoute(async ({ db, gameId, log }) => {
  const game = await findGameById(gameId);

  if (!game) {
    return NextResponse.json(
      { success: false, error: "Game not found." },
      { status: 404 },
    );
  }

  const notFinalised = await requireFinalisedGuard(gameId);
  if (notFinalised) return notFinalised;
  let result;
  try {
    result = await uploadResultsToBridgewebs(
      db,
      game,
      game.tournamentLevel ?? DEFAULT_TOURNAMENT_LEVEL,
    );
  } catch (err) {
    log.warn({ err, gameId }, "BridgeWebs upload transport failure");
    return NextResponse.json(
      {
        success: false,
        error: "Could not reach BridgeWebs. Check the connection and retry.",
      },
      { status: 502 },
    );
  }

  if (result.status === "blocked") {
    const error =
      result.reason === "club"
        ? "Club info not configured. Set the club name and EBU number in Settings → EBU."
        : "BridgeWebs is not configured. Add your club code and password in Settings.";
    return NextResponse.json({ success: false, error }, { status: 400 });
  }

  // A real attempt was made. Surface BridgeWebs' own status: `ok` reflects its
  // parsed `message`, which the UI shows either way (success or error text).
  return success({
    ok: result.reply.ok,
    message: result.reply.message,
  });
});
