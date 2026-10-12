import "server-only";

import { BridgeGame } from "@/db/game-index/schema";
import { Db } from "@/db/games";
import { findClub } from "@/db/system/queries/find-club";
import { getEbuCredentials } from "@/db/system/queries/ebu-credentials";
import { generateUsebio } from "@/services/usebio-service";
import {
  parseUsebio,
  checkPlayers,
  checkSessionDate,
  submitSession,
  type EbuAuth,
  type EbuSubmitResult,
} from "@/lib/ebu/client";
import {
  collectSessionPlayers,
  toPlayerChecks,
  applyCheckKeys,
} from "@/lib/ebu/session-players";

/** Why an upload could not even be attempted (missing prerequisites). */
export type EbuUploadBlockedReason = "club" | "credentials";

/** A single-sentence advisory surfaced to the director (non-fatal). */
export type EbuUploadWarning = string;

export type EbuUploadResult =
  | {
      status: "sent";
      /** The EBU's own outcome for the submission. */
      submission: EbuSubmitResult;
      /** Advisory notes gathered during the workflow (duplicate date etc.). */
      advisories: EbuUploadWarning[];
    }
  | { status: "blocked"; reason: EbuUploadBlockedReason };

/** Build a filesystem-safe filename from the event name + date. */
function usebioFilename(game: BridgeGame): string {
  const safeName = game.eventName.replace(/[^a-zA-Z0-9]/g, "_");
  const date = game.eventDate.split("T")[0];
  return `${safeName}_${date}.xml`;
}

/** Convert an ISO date (`YYYY-MM-DD...`) to the EBU's `YYYYMMDD` form. */
function toEbuDate(eventDate: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(eventDate);
  return match ? `${match[1]}${match[2]}${match[3]}` : null;
}

/**
 * Upload a game's results to the EBU, running the documented session-submission
 * workflow end to end:
 *
 *   1. Generate the USEBIO XML (reusing the same generator BridgeWebs uses).
 *   2. Hand it to the EBU parser, which returns the session JSON.
 *   3. (Advisory) check the session date for duplicates / Sim Pairs events.
 *   4. Collect the players, run check-players, and write the returned check
 *      keys back onto the session JSON (skipping the slower re-check at submit).
 *   5. Submit the session JSON and return the EBU's outcome.
 *
 * Prerequisites are surfaced as a `blocked` result (not a throw) so the caller
 * can map them to a helpful message:
 *  - `club`: club name/number not set in Settings (needed for the USEBIO file).
 *  - `credentials`: EBU number/password not configured.
 *
 * Transport failures (an {@link import("@/lib/ebu/client").EbuApiError} or a
 * network error) propagate as a rejected promise for the route to translate.
 * The EBU's own logical rejection (a `failure` message) comes back as
 * `submission.ok === false`, not a throw.
 */
export async function uploadResultsToEbu(
  db: Db,
  game: BridgeGame,
): Promise<EbuUploadResult> {
  const club = await findClub();
  if (!club) {
    return { status: "blocked", reason: "club" };
  }

  const credentials = await getEbuCredentials();
  if (!credentials) {
    return { status: "blocked", reason: "credentials" };
  }

  const auth: EbuAuth = {
    ebuNumber: credentials.ebuNumber,
    password: credentials.password,
  };

  const usebioXml = await generateUsebio(db, game, club);
  const filename = usebioFilename(game);

  // Step 2: parse. The parser returns the session JSON the rest of the flow
  // operates on.
  const sessionData = await parseUsebio(auth, usebioXml, filename);

  const advisories: EbuUploadWarning[] = [];

  // Step 3 (advisory): has this date been submitted before, and is there a Sim
  // Pairs event registered? Never fatal — a failure here must not block a valid
  // submission, so swallow transport errors.
  const ebuDate = toEbuDate(game.eventDate);
  if (ebuDate) {
    try {
      const dateCheck = await checkSessionDate(auth, ebuDate);
      if (dateCheck.duplicates > 0) {
        advisories.push(
          `The EBU already has ${dateCheck.duplicates} session(s) submitted for this date — this may be a duplicate.`,
        );
      }
      for (const sim of dateCheck.sims) {
        advisories.push(
          `A Sim Pairs event ("${sim.description}") is registered for this date.`,
        );
      }
    } catch {
      // Advisory only; proceed with the submission regardless.
    }
  }

  // Step 4: validate players and fold the check keys back into the session JSON
  // so the final submit doesn't have to re-check them. Players with a bad EBU
  // number or a surname mismatch simply get no check key (the EBU will re-check
  // them at submit and may warn); we surface those as advisories.
  const players = collectSessionPlayers(sessionData);
  if (players.length > 0) {
    const checks = toPlayerChecks(players);
    const checkResult = await checkPlayers(auth, checks);
    applyCheckKeys(players, checkResult.players);

    if (checkResult.badEbus > 0) {
      advisories.push(
        `${checkResult.badEbus} player(s) have an EBU number the EBU does not recognise.`,
      );
    }
    if (checkResult.mismatches > 0) {
      advisories.push(
        `${checkResult.mismatches} player(s) have a surname that does not match their EBU number.`,
      );
    }
  }

  // Step 5: submit.
  const submission = await submitSession(auth, sessionData);
  return { status: "sent", submission, advisories };
}
