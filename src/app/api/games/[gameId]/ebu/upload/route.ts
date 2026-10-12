import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { uploadResultsToEbu } from "@/services/ebu-upload-service";

/**
 * POST /api/games/[gameId]/ebu/upload — submit this game's results to the EBU.
 * Director-authed. Runs the full EBU submission workflow (parse USEBIO → check
 * players → submit) and returns the EBU's outcome plus any advisories so the UI
 * can show them inline.
 *
 * Missing prerequisites (club info / credentials) return 400 with a helpful
 * message; a transport failure returns 502. A submission the EBU rejected
 * returns HTTP 200 with `ok: false` and the failure message (consistent with
 * the BridgeWebs route, where the UI shows the message either way).
 */
export const POST = withDirectorRoute(async ({ db, gameId, log }) => {
  const game = await findGameById(gameId);

  if (!game) {
    return NextResponse.json(
      { success: false, error: "Game not found." },
      { status: 404 },
    );
  }

  let result;
  try {
    result = await uploadResultsToEbu(db, game);
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
        ? "Club info not configured. Set club name and number in Settings."
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
});
