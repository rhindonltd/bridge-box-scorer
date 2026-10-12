import type { EbuPlayerCheck, EbuPlayerCheckResult } from "@/lib/ebu/client";

/**
 * Helpers for walking the EBU parser's session JSON to find player records and
 * write check keys back onto them.
 *
 * The EBU deliberately does not document the exact shape of the JSON object
 * returned by the USEBIO parser, and warns that it may add fields over time.
 * Rather than hard-code a path, we treat any object that carries both an `ebu`
 * and a `surname` property as a player record. This is robust to the parser
 * nesting players under sections/participants in whatever way it chooses, and
 * matches the documented contract: "extract all the players", then "update the
 * JSON object with the check keys (this is a `check` field in the player
 * object)".
 */

/** A player record discovered inside the parsed session JSON. */
export type SessionPlayerRef = {
  ebu: string;
  surname: string;
  /** The live object to mutate when writing the check key back. */
  ref: Record<string, unknown>;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Recursively collect every player-like object (one with string `ebu` and
 * `surname` fields) reachable from `node`. Returns live references so callers
 * can annotate them in place.
 */
export function collectSessionPlayers(node: unknown): SessionPlayerRef[] {
  const found: SessionPlayerRef[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!isPlainObject(value)) return;

    const ebu = value.ebu;
    const surname = value.surname;
    if (typeof ebu === "string" && typeof surname === "string") {
      found.push({ ebu, surname, ref: value });
    }

    for (const child of Object.values(value)) visit(child);
  };

  visit(node);
  return found;
}

/**
 * Build the de-duplicated `{ ebu, surname }` list to send to the check-players
 * endpoint. The same person can appear more than once in a session (e.g. a
 * pivot teams event), and the EBU only needs each distinct pair checked once.
 */
export function toPlayerChecks(players: SessionPlayerRef[]): EbuPlayerCheck[] {
  const seen = new Map<string, EbuPlayerCheck>();
  for (const p of players) {
    const key = `${p.ebu}\u0000${p.surname}`;
    if (!seen.has(key)) seen.set(key, { ebu: p.ebu, surname: p.surname });
  }
  return [...seen.values()];
}

/**
 * Write the `check` keys returned by the check-players endpoint back onto the
 * matching player objects in the session JSON (mutating them in place), keyed
 * by `ebu`+`surname`. Players without a check key (a bad EBU number or a
 * mismatch) are left untouched.
 */
export function applyCheckKeys(
  players: SessionPlayerRef[],
  results: EbuPlayerCheckResult[],
): void {
  const checkByKey = new Map<string, string>();
  for (const r of results) {
    if (typeof r.check === "string") {
      checkByKey.set(`${r.ebu}\u0000${r.surname}`, r.check);
    }
  }

  for (const p of players) {
    const check = checkByKey.get(`${p.ebu}\u0000${p.surname}`);
    if (check) p.ref.check = check;
  }
}
