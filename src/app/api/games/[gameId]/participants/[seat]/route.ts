import { withDirectorRoute } from "@/lib/api/directorRoute";
import { success } from "@/lib/api/success";
import { ClientError, respondToActionError } from "@/lib/api/client-error";
import { deleteParticipant } from "@/db/games/actions/delete-participant";
import { broadcastParticipants } from "@/socket/broadcast/participant-broadcast";
import { isPairSeat, type Seat } from "@/model/participants";

/**
 * Extract the `[seat]` path segment from a participants route URL, i.e. the
 * segment immediately after `/participants/`. Returns null when absent.
 */
function seatFromUrl(url: string): string | null {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const idx = parts.lastIndexOf("participants");
  if (idx === -1) return null;
  const seat = parts[idx + 1];
  return seat ? decodeURIComponent(seat) : null;
}

/**
 * DELETE /api/games/[gameId]/participants/[seat] — evict (remove) the pair
 * seated at `seat` (director-only). Broadcasts the updated participant list.
 */
export const DELETE = withDirectorRoute(async ({ gameId, req }) => {
  const seat = seatFromUrl(req.url);

  try {
    if (!seat || !isPairSeat(seat as Seat)) {
      // A malformed seat is a caller error, not a server fault.
      throw new ClientError("Invalid seat");
    }

    await deleteParticipant(gameId, seat as Seat);
    await broadcastParticipants(gameId);
  } catch (err) {
    return respondToActionError(
      err,
      `Failed to evict participant at seat ${seat} in game ${gameId}:`,
    );
  }

  return success({});
});
