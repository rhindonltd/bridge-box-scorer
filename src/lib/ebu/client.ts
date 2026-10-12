import "server-only";

/**
 * EBU API transport client.
 *
 * Thin, DB/React-free wrapper over the English Bridge Union's REST API
 * (https://www.ebu.co.uk/apidocs/). Submitting a session is a multi-step
 * workflow, not a single upload, so this module exposes one function per step
 * and the orchestration lives in the upload service:
 *
 *   1. {@link parseUsebio}      — hand the USEBIO file to the EBU parser; it
 *                                 returns the session JSON the rest of the flow
 *                                 operates on.
 *   2. {@link checkSessionDate} — advisory: has this date already been
 *                                 submitted, and is there a Sim Pairs event?
 *   3. {@link checkPlayers}     — validate EBU numbers against surnames and
 *                                 collect the per-player `check` keys.
 *   4. {@link submitSession}    — submit the (player-annotated) session JSON;
 *                                 on success the new `SessionID` is returned.
 *
 * Auth is HTTP Basic: the username is the club/county EBU number and the
 * password is the account password (the API also accepts a token in place of
 * the password, which a future enhancement could store instead).
 */

/**
 * Base URL for the versioned REST API. `EBU_API_BASE` can override it so tests
 * (and any self-hosted proxy) can point the outbound calls at a stand-in server
 * without touching the client — mirroring BridgeWebs' `BRIDGEWEBS_API_BASE`.
 */
export const EBU_API_BASE =
  process.env.EBU_API_BASE ?? "https://www.ebu.co.uk/members/api-3.1";

/**
 * The USEBIO parser lives OUTSIDE the versioned API (under `/members/api/p2p`),
 * so it has its own override. Defaults to the 1.1 parser documented for session
 * submission.
 */
export const EBU_PARSE_USEBIO_URL =
  process.env.EBU_PARSE_USEBIO_URL ??
  "https://www.ebu.co.uk/members/api/p2p/parse-usebio-1.1.php";

/** The EBU credentials used for every authenticated call. */
export type EbuAuth = {
  /** EBU club/county number — the Basic-Auth username. */
  ebuNumber: string;
  /** Account password — the Basic-Auth password. */
  password: string;
};

/** A single player to validate, as sent to the check-players endpoint. */
export type EbuPlayerCheck = {
  ebu: string;
  surname: string;
};

/** The result for one player returned by the check-players endpoint. */
export type EbuPlayerCheckResult = {
  ebu: string;
  surname: string;
  /** Present (opaque hash) when the EBU number/surname matched. */
  check?: string;
  /** 1 when the supplied surname did not match the EBU number on file. */
  mismatch?: number;
  /** When mismatched, the surname the EBU holds for this number. */
  found_surname?: string;
  /** 1 when the EBU number does not exist on the database. */
  bad_ebu?: number;
};

/** The normalized outcome of the check-players step. */
export type EbuCheckPlayersResult = {
  players: EbuPlayerCheckResult[];
  badEbus: number;
  mismatches: number;
};

/** A Sim Pairs event we are registered for on a given date. */
export type EbuSim = {
  id: string;
  description: string;
};

/** The outcome of the advisory session-date check. */
export type EbuSessionDateResult = {
  /** Sim Pairs events registered for this date (usually zero or one). */
  sims: EbuSim[];
  /** How many sessions we have already submitted for this date. */
  duplicates: number;
};

/** The outcome of the final submission. */
export type EbuSubmitResult =
  | { ok: true; sessionId: string; warnings: string[] }
  | { ok: false; failure: string; warnings: string[] };

/** Raised when the EBU API returns a non-2xx HTTP status. */
export class EbuApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: string,
  ) {
    super(message);
    this.name = "EbuApiError";
  }
}

/** Build the `Authorization: Basic ...` header value for a set of credentials. */
export function basicAuthHeader(auth: EbuAuth): string {
  const token = Buffer.from(`${auth.ebuNumber}:${auth.password}`).toString(
    "base64",
  );
  return `Basic ${token}`;
}

/**
 * The EBU API wraps every JSON reply in a top-level `response` object (e.g.
 * `{ "response": { "login": "club", ... } }`). Unwrap it, tolerating a reply
 * that is already flat.
 */
export function unwrapResponse(body: unknown): Record<string, unknown> {
  if (body == null || typeof body !== "object") return {};
  const inner = (body as { response?: unknown }).response;
  if (inner != null && typeof inner === "object") {
    return inner as Record<string, unknown>;
  }
  return body as Record<string, unknown>;
}

/** Coerce an EBU numeric-ish field (which may arrive as a string) to a number. */
function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

/** The EBU returns single-item lists as a bare object; always get an array. */
function toArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value == null) return [];
  return [value as T];
}

/**
 * Perform an authenticated JSON request against the versioned API and return
 * the unwrapped `response` object. Adds `format=json` so the API returns JSON
 * rather than its default. Throws {@link EbuApiError} on a non-2xx status.
 */
async function requestJson(
  auth: EbuAuth,
  method: "GET" | "POST",
  path: string,
  params: Record<string, string> = {},
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const url = new URL(`${EBU_API_BASE}${path}`);
  url.searchParams.set("format", "json");

  const init: RequestInit = {
    method,
    headers: {
      Authorization: basicAuthHeader(auth),
      Accept: "application/json",
    },
  };

  if (method === "GET") {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  } else {
    const search = new URLSearchParams(params);
    init.body = search.toString();
    init.headers = {
      ...init.headers,
      "Content-Type": "application/x-www-form-urlencoded",
    };
  }

  const res = await fetchImpl(url.toString(), init);
  const raw = await res.text();

  if (!res.ok) {
    throw new EbuApiError(
      `EBU API ${method} ${path} failed: HTTP ${res.status} ${res.statusText}`.trim(),
      res.status,
      raw,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EbuApiError(
      `EBU API ${method} ${path} returned non-JSON body`,
      res.status,
      raw,
    );
  }

  return unwrapResponse(parsed);
}

/**
 * Step 1 — submit the USEBIO file to the EBU parser. The file is sent as
 * multipart form data under the field name `myfile` (as the docs require). The
 * reply is the session JSON object the rest of the submission flow operates on;
 * it is returned verbatim so the service can inspect any parser errors and then
 * annotate players before the final submit.
 *
 * Note the parser endpoint is unversioned (`/members/api/p2p/...`) and still
 * requires the Basic-Auth header.
 */
export async function parseUsebio(
  auth: EbuAuth,
  usebioXml: string,
  filename: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.set(
    "myfile",
    new Blob([usebioXml], { type: "application/xml" }),
    filename,
  );

  const res = await fetchImpl(EBU_PARSE_USEBIO_URL, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(auth),
      Accept: "application/json",
    },
    body: form,
  });

  const raw = await res.text();

  if (!res.ok) {
    throw new EbuApiError(
      `EBU USEBIO parse failed: HTTP ${res.status} ${res.statusText}`.trim(),
      res.status,
      raw,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EbuApiError(
      "EBU USEBIO parser returned non-JSON body",
      res.status,
      raw,
    );
  }

  return unwrapResponse(parsed);
}

/**
 * Step 2 (advisory) — check whether this date already has submitted sessions
 * (possible duplicate) and whether a Sim Pairs event is registered for it.
 *
 * @param date `yyyymmdd`, as the API expects.
 */
export async function checkSessionDate(
  auth: EbuAuth,
  date: string,
  fetchImpl: typeof fetch = fetch,
): Promise<EbuSessionDateResult> {
  const body = await requestJson(
    auth,
    "GET",
    `/session-date/${encodeURIComponent(date)}`,
    {},
    fetchImpl,
  );

  const sims = toArray<Record<string, unknown>>(body.Sims).map((s) => ({
    id: String(s.ID ?? ""),
    description: String(s.Description ?? ""),
  }));

  return { sims, duplicates: toNumber(body.Duplicates) };
}

/**
 * Step 3 — validate a list of players (EBU number vs surname). Returns each
 * player's result (including the `check` key on a match) plus the totals, so
 * the caller can both annotate the session JSON with check keys and decide
 * whether any bad numbers / mismatches should block the submission.
 */
export async function checkPlayers(
  auth: EbuAuth,
  players: EbuPlayerCheck[],
  fetchImpl: typeof fetch = fetch,
): Promise<EbuCheckPlayersResult> {
  const body = await requestJson(
    auth,
    "POST",
    "/submission/check-players",
    { data: JSON.stringify(players) },
    fetchImpl,
  );

  const results = toArray<Record<string, unknown>>(body.Players).map((p) => {
    const result: EbuPlayerCheckResult = {
      ebu: String(p.ebu ?? ""),
      surname: String(p.surname ?? ""),
    };
    if (typeof p.check === "string") result.check = p.check;
    if (p.mismatch != null) result.mismatch = toNumber(p.mismatch);
    if (typeof p.found_surname === "string") {
      result.found_surname = p.found_surname;
    }
    if (p.bad_ebu != null) result.bad_ebu = toNumber(p.bad_ebu);
    return result;
  });

  return {
    players: results,
    badEbus: toNumber(body.BadEBUs),
    mismatches: toNumber(body.Mismatches),
  };
}

/**
 * Step 4 — submit the session. `sessionData` is the (player-check-annotated)
 * JSON object produced by {@link parseUsebio}; it is sent JSON-encoded in the
 * `data` field. Success is signalled by a `SessionID` on the reply; a
 * `failure` message means the submission was rejected. Either way any
 * `warnings` are surfaced for diagnostics.
 */
export async function submitSession(
  auth: EbuAuth,
  sessionData: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<EbuSubmitResult> {
  const body = await requestJson(
    auth,
    "POST",
    "/submission",
    { data: JSON.stringify(sessionData) },
    fetchImpl,
  );

  const warnings = toArray<unknown>(body.warnings).map((w) => String(w));
  const failure = body.failure;

  if (failure != null && String(failure).trim() !== "") {
    return { ok: false, failure: String(failure), warnings };
  }

  const sessionId = body.SessionID;
  if (sessionId != null && String(sessionId).trim() !== "") {
    return { ok: true, sessionId: String(sessionId), warnings };
  }

  // No SessionID and no explicit failure: treat as a failure with a generic
  // message so the caller never reports a phantom success.
  return {
    ok: false,
    failure: "EBU did not return a session id.",
    warnings,
  };
}
