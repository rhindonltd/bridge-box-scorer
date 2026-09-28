import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import type { NamedSeating } from "@/services/swiss-seating-names";
import type { SerializableAdvisoryInputs } from "@/movement/swiss/swiss-pairing";

/** A single table's seating as stable Swiss pair ids. */
export interface SwissSeatingEntry {
  tableNumber: number;
  ns: number;
  ew: number;
}

/**
 * What the server returns for a PREVIEWED (uncommitted) Swiss draw: the
 * proposed seating (pair ids the client edits and echoes back on commit), the
 * resolved player names for display, the sit-out pair, and the advisories.
 */
export interface SwissPreviewAck {
  roundNumber: number;
  tables: number;
  seating: SwissSeatingEntry[];
  sitOutPairId: number | null;
  named: NamedSeating;
  advisoryInputs: SerializableAdvisoryInputs;
  hadUnavoidableRepeat: boolean;
  hadStationaryConflict: boolean;
}

/** What the server reports back once a Swiss round is committed. */
export interface SwissCommitAck {
  roundNumber: number;
}

/**
 * Ask the server to PREVIEW (not commit) the next Swiss Pairs round for a
 * section, from the current standings. Director-only. Resolves with the
 * proposed seating + names + advisories, or rejects with the server's message
 * (e.g. the current round isn't fully scored, or the event is complete).
 * Nothing is written or broadcast by a preview.
 */
export async function previewNextSwissRound(
  gameId: string,
  section: string,
): Promise<SwissPreviewAck> {
  return emitWithAck<SwissPreviewAck>(SocketEvents.PREVIEW_NEXT_SWISS_ROUND, {
    gameId,
    section,
    directorToken: getDirectorToken(gameId) ?? "",
  });
}

/**
 * Commit the next Swiss Pairs round with the EXACT seating the director
 * accepted — the previewed draw, possibly edited (pairs swapped, bye
 * reassigned). Director-only. Materializes that round and broadcasts the live
 * updates. Rejects if the seating is structurally invalid or the preconditions
 * no longer hold.
 */
export async function commitNextSwissRound(
  gameId: string,
  section: string,
  seating: SwissSeatingEntry[],
  sitOutPairId: number | null,
): Promise<SwissCommitAck> {
  return emitWithAck<SwissCommitAck>(SocketEvents.DRAW_NEXT_SWISS_ROUND, {
    gameId,
    section,
    directorToken: getDirectorToken(gameId) ?? "",
    seating,
    sitOutPairId,
  });
}
