import "server-only";

import { BridgeGame } from "@/db/game-index/schema";
import { Db } from "@/db/games";
import { findClub } from "@/db/system/queries/find-club";
import { getBridgewebsCredentials } from "@/db/system/queries/bridgewebs-credentials";
import { generateUsebio } from "@/services/usebio-service";
import { generatePbnExport } from "@/services/pbn-service";
import { postToBridgewebs, type BridgewebsReply } from "@/lib/bridgewebs/client";

/** Why an upload could not even be attempted (missing prerequisites). */
export type BridgewebsUploadBlockedReason = "club" | "credentials";

export type BridgewebsUploadResult =
  | { status: "sent"; reply: BridgewebsReply }
  | { status: "blocked"; reason: BridgewebsUploadBlockedReason };

/** Build a filesystem-safe base filename from the event name + date. */
function baseFilename(game: BridgeGame): string {
  const safeName = game.eventName.replace(/[^a-zA-Z0-9]/g, "_");
  const date = game.eventDate.split("T")[0];
  return `${safeName}_${date}`;
}

/**
 * Upload a game's results to BridgeWebs.
 *
 * Sends the USEBIO XML as the results file (`data`/`filename`) plus the PBN
 * deal file (`dealdata`/`dealname`), and attaches to the game's chosen
 * BridgeWebs calendar event (`event_id`) when one was selected on creation.
 *
 * Prerequisites are surfaced as a `blocked` result (not a throw) so the caller
 * can map them to a helpful message:
 *  - `club`: club name/number not set in Settings (needed for the USEBIO file).
 *  - `credentials`: BridgeWebs club code/password not configured.
 *
 * On a real attempt, the parsed BridgeWebs reply is returned as-is; transport
 * failures propagate as a rejected promise for the route to translate.
 */
export async function uploadResultsToBridgewebs(
  db: Db,
  game: BridgeGame,
): Promise<BridgewebsUploadResult> {
  const club = await findClub();
  if (!club) {
    return { status: "blocked", reason: "club" };
  }

  const credentials = await getBridgewebsCredentials();
  if (!credentials) {
    return { status: "blocked", reason: "credentials" };
  }

  const [usebioXml, pbn] = await Promise.all([
    generateUsebio(db, game, club),
    generatePbnExport(db, game, club),
  ]);

  const base = baseFilename(game);

  const fields: Record<string, string> = {
    club: credentials.club,
    password: credentials.password,
    type: "upload",
    filename: `${base}.xml`,
    data: usebioXml,
    dealname: `${base}.pbn`,
    dealdata: pbn,
  };

  // Only send event_id when the game was mapped to a BridgeWebs event; an empty
  // value would otherwise ask BridgeWebs to attach to event "".
  if (game.bridgewebsEventId) {
    fields.event_id = game.bridgewebsEventId;
  }

  const reply = await postToBridgewebs(credentials.club, fields);
  return { status: "sent", reply };
}
