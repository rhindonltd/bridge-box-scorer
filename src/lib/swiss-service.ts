import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";
import type { NamedSeating } from "@/services/swiss-seating-names";
import type { NamedTeamsSeating } from "@/services/swiss-teams-seating-names";
import type { SerializableAdvisoryInputs } from "@/movement/swiss/swiss-pairing";
import type { SerializableTeamsAdvisoryInputs } from "@/movement/swiss-teams/swiss-teams-pairing";
import type { SwissStandingEntry } from "@/movement/swiss/swiss-standings";

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
  /** Current standings (best first) with running VP totals — the draw order. */
  standings: SwissStandingEntry[];
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


// --- Swiss Teams --------------------------------------------------------

/** A single drawn team match, by stable team id. */
export interface TeamsMatchEntry {
  a: number;
  b: number;
}

/** A three-way triangle, by stable team id. */
export interface TeamsTriangleEntry {
  a: number;
  b: number;
  c: number;
}

/**
 * What the server returns for a PREVIEWED (uncommitted) Swiss Teams draw: the
 * proposed matches (team ids the client echoes back on commit), the odd-field
 * resolution (bye team or triangle), resolved team names for display, and the
 * repeat advisory.
 */
export interface SwissTeamsPreviewAck {
  roundNumber: number;
  teams: number;
  matches: TeamsMatchEntry[];
  byeTeamId: number | null;
  triangle: TeamsTriangleEntry | null;
  named: NamedTeamsSeating;
  /** Current standings (best first) with running VP totals — the draw order. */
  standings: SwissStandingEntry[];
  /** Team-pair keys of drawn matches that repeat an earlier opponent. */
  repeatMatchKeys: string[];
  /** Team count + played opponents, so the client re-checks repeats after edits. */
  advisoryInputs: SerializableTeamsAdvisoryInputs;
  hadUnavoidableRepeat: boolean;
}

/** What the server reports back once a Swiss Teams round is committed. */
export interface SwissTeamsCommitAck {
  roundNumber: number;
}

/**
 * Ask the server to PREVIEW (not commit) the next Swiss Teams round for a
 * section. Director-only. Resolves with the proposed matches + names +
 * advisory, or rejects with the server's message. Nothing is written or
 * broadcast by a preview.
 */
export async function previewNextSwissTeamsRound(
  gameId: string,
  section: string,
): Promise<SwissTeamsPreviewAck> {
  return emitWithAck<SwissTeamsPreviewAck>(
    SocketEvents.PREVIEW_NEXT_SWISS_TEAMS_ROUND,
    { gameId, section, directorToken: getDirectorToken(gameId) ?? "" },
  );
}

/**
 * Commit the next Swiss Teams round with the EXACT matches the director
 * accepted (the previewed draw; editing is a later step). Director-only.
 * Materializes that round and broadcasts the live updates. Rejects if the round
 * is structurally invalid or the preconditions no longer hold.
 */
export async function commitNextSwissTeamsRound(
  gameId: string,
  section: string,
  matches: TeamsMatchEntry[],
  byeTeamId: number | null,
  triangle: TeamsTriangleEntry | null,
): Promise<SwissTeamsCommitAck> {
  return emitWithAck<SwissTeamsCommitAck>(
    SocketEvents.DRAW_NEXT_SWISS_TEAMS_ROUND,
    {
      gameId,
      section,
      directorToken: getDirectorToken(gameId) ?? "",
      matches,
      byeTeamId,
      triangle,
    },
  );
}
