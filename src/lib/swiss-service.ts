import { SocketEvents } from "@/socket/socket-events";
import { emitWithAck } from "@/lib/socket";
import { getDirectorToken } from "@/lib/director-token";

/** What the server reports back about a drawn Swiss round. */
export interface SwissDrawAck {
  roundNumber: number;
  sitOutPairId: number | null;
  hadUnavoidableRepeat: boolean;
  hadStationaryConflict: boolean;
}

/**
 * Ask the server to draw the next Swiss Pairs round for a section, from the
 * current standings. Director-only: the device's director token for this game
 * travels in the payload. Resolves with the drawn round and its advisories, or
 * rejects with the server's message (e.g. the current round isn't fully scored,
 * or the event is complete).
 */
export async function drawNextSwissRound(
  gameId: string,
  section: string,
): Promise<SwissDrawAck> {
  return emitWithAck<SwissDrawAck>(SocketEvents.DRAW_NEXT_SWISS_ROUND, {
    gameId,
    section,
    directorToken: getDirectorToken(gameId) ?? "",
  });
}
