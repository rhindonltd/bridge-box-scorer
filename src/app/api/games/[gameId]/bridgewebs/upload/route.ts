import { z } from "zod";
import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { updateTournamentLevel } from "@/db/game-index/actions/update-tournament-level";
import { TournamentLevels } from "@/db/games/types/tournament-level";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { uploadResultsToBridgewebs } from "@/services/bridgewebs-upload-service";

// The export flow carries the EBU tournament level chosen for this upload. It
// fixes the USEBIO masterpoint/charge fields and is saved back to the game so
// it pre-fills next time.
const bodySchema = z.object({
  tournamentLevel: z.enum(TournamentLevels),
});

/**
 * POST /api/games/[gameId]/bridgewebs/upload — upload this game's results to
 * BridgeWebs. Director-authed. The `tournamentLevel` body field sets the EBU
 * level for this export (and is persisted for next time). Returns the parsed
 * BridgeWebs status message so the UI can show it inline. Missing prerequisites
 * (club info / credentials) return 400 with a helpful message; a transport
 * failure returns 502.
 */
export const POST = withDirectorRoute(
  async ({ db, gameId, body, log }) => {
    const game = await findGameById(gameId);

    if (!game) {
      return NextResponse.json(
        { success: false, error: "Game not found." },
        { status: 404 },
      );
    }

    // Persist the chosen level so it pre-fills the next export.
    await updateTournamentLevel(gameId, body.tournamentLevel);

    let result;
    try {
      result = await uploadResultsToBridgewebs(db, game, body.tournamentLevel);
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
          ? "Club info not configured. Set club name and number in Settings."
          : "BridgeWebs is not configured. Add your club code and password in Settings.";
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    // A real attempt was made. Surface BridgeWebs' own status: `ok` reflects its
    // parsed `message`, which the UI shows either way (success or error text).
    return success({
      ok: result.reply.ok,
      message: result.reply.message,
    });
  },
  { bodySchema },
);
