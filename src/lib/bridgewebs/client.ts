/**
 * Thin client for the BridgeWebs HTTP API.
 *
 * BridgeWebs exposes a single form-encoded POST endpoint
 * (`.../cgi-bin/bwx/api.cgi?club=<clubcode>`). The request body carries the
 * operation (`type`), credentials (`club`/`password`) and any file payloads
 * inline. The reply is a plain-text body that carries a `message = ...` line
 * whose text indicates success or failure; for downloads it may also carry a
 * `json = {...}` line.
 *
 * This module is pure transport + parsing: it builds the body, performs the
 * `fetch`, and parses the reply. It has no React or DB dependencies so it stays
 * unit-testable, and it never reads or persists credentials itself — callers
 * pass them in.
 */

/**
 * Base endpoint. The `club` query param is appended per the API docs.
 *
 * Defaults to the real BridgeWebs API. `BRIDGEWEBS_API_BASE` can override it so
 * tests (and any self-hosted proxy) can point the outbound POST at a stand-in
 * server without touching the client — mirroring how the data dir and the
 * crypto key path are env-overridable.
 */
export const BRIDGEWEBS_API_BASE =
  process.env.BRIDGEWEBS_API_BASE ??
  "https://www.bridgewebs.com/cgi-bin/bwx/api.cgi";

/** Fields sent to the API. All values are strings (form-encoded). */
export type BridgewebsFields = Record<string, string>;

/** The parsed outcome of an API call. */
export type BridgewebsReply = {
  /**
   * Whether the reply's `message` indicates success. BridgeWebs signals success
   * with phrases containing "Successful" (e.g. "Upload Successful", "Download
   * Successful"); anything else (or a missing message) is treated as failure.
   */
  ok: boolean;
  /** The parsed `message = ...` text, or null if none was present. */
  message: string | null;
  /** The parsed `json = ...` payload, if present (used by download calls). */
  json: string | null;
  /** The raw reply body, for diagnostics. */
  raw: string;
};

/** A calendar event for a given day, normalized from the events payload. */
export type BridgewebsEvent = {
  /** The event id used as `event_id` on upload (e.g. "1"). */
  id: string;
  /** The human-readable event title. */
  title: string;
};

/** Build the full endpoint URL for a club code. */
export function bridgewebsUrl(club: string): string {
  return `${BRIDGEWEBS_API_BASE}?club=${encodeURIComponent(club)}`;
}

/**
 * Build the form-encoded request body from a field map. Uses
 * `URLSearchParams` so values are correctly percent-encoded (matching the
 * `application/x-www-form-urlencoded` content type the API expects).
 */
export function buildBody(fields: BridgewebsFields): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    params.set(key, value);
  }
  return params.toString();
}

/**
 * Parse a `key = value` line out of the reply body. BridgeWebs formats replies
 * as lines like `message = Upload Successful`. Matching is done per line and is
 * tolerant of surrounding whitespace. Returns the first match's value, or null.
 */
export function parseReplyField(raw: string, key: string): string | null {
  const lines = raw.split(/\r?\n/);
  const prefix = new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`);
  for (const line of lines) {
    const m = line.match(prefix);
    if (m) return m[1].trim();
  }
  return null;
}

/**
 * Parse a raw reply body into a {@link BridgewebsReply}. A message containing
 * "Successful" (case-insensitive) marks the call as ok.
 */
export function parseReply(raw: string): BridgewebsReply {
  const message = parseReplyField(raw, "message");
  const json = parseReplyField(raw, "json");
  const ok = message != null && /successful/i.test(message);
  return { ok, message, json, raw };
}

/**
 * The "Create New Event" placeholder BridgeWebs appends to every day's event
 * list. It is not a real, uploadable event, so it is filtered out.
 */
const CREATE_NEW_EVENT_TITLE = "Create New Event";

/**
 * Normalize the events payload (from `type=download&transfer=events&format=json`)
 * into an ordered list of `{ id, title }`. The payload shape is:
 *   { "events": { "1": { "title": "Duplicate Pairs", "file": "..." }, ... } }
 *
 * Accepts either a parsed object or a JSON string. Malformed input yields an
 * empty list rather than throwing, so a bad reply degrades gracefully.
 */
export function parseEventsResponse(input: unknown): BridgewebsEvent[] {
  let payload: unknown = input;

  if (typeof input === "string") {
    try {
      payload = JSON.parse(input);
    } catch {
      return [];
    }
  }

  if (payload == null || typeof payload !== "object") return [];

  const events = (payload as { events?: unknown }).events;
  if (events == null || typeof events !== "object") return [];

  const result: BridgewebsEvent[] = [];
  for (const [id, value] of Object.entries(events as Record<string, unknown>)) {
    if (value == null || typeof value !== "object") continue;
    const title = (value as { title?: unknown }).title;
    if (typeof title !== "string") continue;
    if (title.trim() === CREATE_NEW_EVENT_TITLE) continue;
    result.push({ id, title });
  }
  return result;
}

/**
 * POST a set of fields to the BridgeWebs API for a club and parse the reply.
 * Network/transport failures surface as a rejected promise; a non-2xx HTTP
 * status is reported as a failed {@link BridgewebsReply} (ok: false) carrying a
 * diagnostic message, since the API itself signals status in the body.
 */
export async function postToBridgewebs(
  club: string,
  fields: BridgewebsFields,
  fetchImpl: typeof fetch = fetch,
): Promise<BridgewebsReply> {
  const res = await fetchImpl(bridgewebsUrl(club), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildBody(fields),
  });

  const raw = await res.text();

  if (!res.ok) {
    return {
      ok: false,
      message: `HTTP ${res.status} ${res.statusText}`.trim(),
      json: null,
      raw,
    };
  }

  return parseReply(raw);
}

/**
 * Fetch the list of BridgeWebs calendar events for a given day.
 *
 * @param club     BridgeWebs club code.
 * @param password BridgeWebs club password.
 * @param date     Date in `YYYYMMDD` form (as the API expects).
 */
export async function fetchEventsForDay(
  club: string,
  password: string,
  date: string,
  fetchImpl: typeof fetch = fetch,
): Promise<BridgewebsEvent[]> {
  const reply = await postToBridgewebs(
    club,
    {
      club,
      password,
      type: "download",
      transfer: "events",
      date,
      format: "json",
    },
    fetchImpl,
  );

  // With `format=json` the events object is returned on the `json = ...` line;
  // some deployments return a pure JSON body instead, so fall back to the raw
  // body when no `json` line is present.
  return parseEventsResponse(reply.json ?? reply.raw);
}
