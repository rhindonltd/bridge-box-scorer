import { z } from "zod";
import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { updateTournamentLevel } from "@/db/game-index/actions/update-tournament-level";
import { TournamentLevels } from "@/db/games/types/tournament-level";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { uploadResultsToEbu } from "@/services/ebu-upload-service";

// The export flow carries the EBU tournament level chosen for this submission.
// It fixes the USEBIO masterpoint/charge fields and is saved back to the game
// so it pre-fills next time.
const bodySchema = z.object({
  tournamentLevel: z.enum(TournamentLevels),
});

/**
 * POST /api/games/[gameId]/ebu/upload — submit this game's results to the EBU.
 * Director-authed. The `tournamentLevel` body field sets the EBU level for this
 * submission (and is persisted for next time). Runs the full EBU submission
 * workflow (parse USEBIO → check players → submit) and returns the EBU's
 * outcome plus any advisories so the UI can show them inline.
 *
 * Missing prerequisites (club info / credentials) return 400 with a helpful
 * message; a transport failure returns 502. A submission the EBU rejected
 * returns HTTP 200 with `ok: false` and the failure message (consistent with
 * the BridgeWebs route, where the UI shows the message either way).
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
      result = await uploadResultsToEbu(db, game, body.tournamentLevel);
    } catch (err) {
      log.warn({ err, gameId }, "EBU upload transport failure");
      return NextResponse.json(
        {
          success: false,
          error: "Could not reach the EBU. Check the connection and retry.",
        },
        { status: 502 },
      );
    }

    if (result.status === "blocked") {
      const error =
        result.reason === "club"
          ? "Club info not configured. Set the club name and EBU number in Settings → EBU."
          : "EBU is not configured. Add your EBU number and password in Settings.";
      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    const { submission, advisories } = result;

    if (submission.ok) {
      return success({
        ok: true,
        message: `Submitted to the EBU (session ${submission.sessionId}).`,
        sessionId: submission.sessionId,
        advisories,
        warnings: submission.warnings,
      });
    }

    return success({
      ok: false,
      message: submission.failure,
      advisories,
      warnings: submission.warnings,
    });
  },
  { bodySchema },
);
