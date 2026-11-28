import "server-only";

import { getDb } from "@/db/game-index";
import { games } from "@/db/game-index/schema";
import { GameType, GameFormat, ScoringType } from "@/model/game-types";
import { eq } from "drizzle-orm";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";

/** The event-detail fields a director may edit after creation. */
export interface EventDetailsUpdate {
  eventName?: string;
  director?: string | null;
  gameType?: GameType;
  eventFormat?: GameFormat;
  scoringType?: ScoringType;
  leadCardRequired?: boolean;
  handEntryEnabled?: boolean;
}

/**
 * Update a game's core event details (name, director, event type, scoring, and
 * the per-game toggles) after creation, so a director can review and adjust
 * what they set on the create form.
 *
 * Changing the STRUCTURE — the game type (pairs vs teams) or the format
 * (standard vs Swiss) or the scoring type — can invalidate a movement already
 * chosen for the game (e.g. switching Pairs↔Teams, or to a Swiss draw). When
 * any structural field actually changes, the selected movement is cleared so
 * the director re-picks one that fits; the name/director/toggles never touch
 * it. Only valid before the game is started (no boards are materialised yet).
 *
 * Returns whether the structure changed, so the caller can also clear each
 * section's movement (stored in the game's own database).
 */
export async function updateEventDetails(
  gameId: string,
  update: EventDetailsUpdate,
): Promise<{ structuralChange: boolean }> {
  const db = getDb();

  const current = await findGameById(gameId);

  // A structural change is one that alters how the field is organised or
  // scored — these can make an already-chosen movement invalid.
  const structuralChange =
    (update.gameType !== undefined &&
      current != null &&
      update.gameType !== current.gameType) ||
    (update.eventFormat !== undefined &&
      current != null &&
      update.eventFormat !== current.eventFormat) ||
    (update.scoringType !== undefined &&
      current != null &&
      update.scoringType !== current.scoringType);

  await db
    .update(games)
    .set({
      ...(update.eventName !== undefined
        ? { eventName: update.eventName }
        : {}),
      ...(update.director !== undefined ? { director: update.director } : {}),
      ...(update.gameType !== undefined ? { gameType: update.gameType } : {}),
      ...(update.eventFormat !== undefined
        ? { eventFormat: update.eventFormat }
        : {}),
      ...(update.scoringType !== undefined
        ? { scoringType: update.scoringType }
        : {}),
      ...(update.leadCardRequired !== undefined
        ? { leadCardRequired: update.leadCardRequired }
        : {}),
      ...(update.handEntryEnabled !== undefined
        ? { handEntryEnabled: update.handEntryEnabled }
        : {}),
      // Clear a now-possibly-invalid movement when the structure changed.
      ...(structuralChange ? { selectedMovement: null } : {}),
    })
    .where(eq(games.gameId, gameId));
  return { structuralChange };
}
