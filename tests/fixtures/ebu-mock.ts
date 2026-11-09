import http from "node:http";
import { AddressInfo } from "node:net";

/**
 * A stand-in for the English Bridge Union's results-submission API, for E2E
 * tests.
 *
 * Submitting to the EBU is a four-call workflow run FROM THE SERVER PROCESS
 * (parse the USEBIO file, check the session date, check the players, submit),
 * so Playwright's browser-level routing cannot intercept it. Instead this is a
 * real local HTTP server and the app is pointed at it with the two env
 * overrides the client already honours (`EBU_API_BASE`, `EBU_PARSE_USEBIO_URL`;
 * playwright.config.ts sets both by default). It:
 *  - answers each call in the EBU's reply shape (a top-level `response`
 *    object), with a configurable outcome, and
 *  - records every call (path, Basic-Auth header, body) so a test can assert
 *    what the app sent.
 */
export type EbuMockMode =
  /** Everything accepted; a SessionID comes back. */
  | "success"
  /** The EBU rejects the submission with a `failure` message. */
  | "rejected"
  /** Every call fails with HTTP 401 (bad credentials). */
  | "unauthorized";

export interface EbuRecordedCall {
  /** `parse`, `session-date`, `check-players` or `submission`. */
  step: "parse" | "session-date" | "check-players" | "submission";
  method: string;
  url: string;
  authorization: string | undefined;
  /** Raw request body (multipart for `parse`, form-encoded otherwise). */
  body: string;
  /** The parsed `data` form field, for check-players / submission. */
  data?: unknown;
}

export interface EbuMock {
  /** Value for `EBU_API_BASE`. */
  apiBase: string;
  /** Value for `EBU_PARSE_USEBIO_URL`. */
  parseUrl: string;
  setMode: (mode: EbuMockMode) => void;
  /** How many sessions the EBU says were already submitted for the date. */
  setDuplicates: (n: number) => void;
  /** Report a surname mismatch for the first player (an advisory). */
  setPlayerMismatch: (on: boolean) => void;
  /** Every call since the last reset, in order. */
  calls: () => EbuRecordedCall[];
  reset: () => void;
  close: () => Promise<void>;
}

/** The players the stand-in "parser" finds in any uploaded file. */
const PLAYERS = [
  { ebu: "477484", surname: "Collier" },
  { ebu: "404476", surname: "Collier" },
];

const API_PATH = "/members/api-3.1";
const PARSE_PATH = "/members/api/p2p/parse-usebio-1.1.php";

/** Port taken from `EBU_API_BASE` (set in playwright.config.ts), else 3998. */
export function ebuMockPort(): number {
  const base = process.env.EBU_API_BASE;
  if (base) {
    try {
      const parsed = new URL(base);
      if (parsed.port) return Number(parsed.port);
    } catch {
      // Fall through to the default on a malformed URL.
    }
  }
  return 3998;
}

export async function startEbuMock(port = ebuMockPort()): Promise<EbuMock> {
  let mode: EbuMockMode = "success";
  let duplicates = 0;
  let mismatch = false;
  let recorded: EbuRecordedCall[] = [];

  const json = (res: http.ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const url = new URL(req.url ?? "/", "http://mock");
      const path = url.pathname;
      const method = req.method ?? "GET";
      const authorization = req.headers.authorization;

      let step: EbuRecordedCall["step"] | null = null;
      if (path === PARSE_PATH) step = "parse";
      else if (path.startsWith(`${API_PATH}/session-date/`))
        step = "session-date";
      else if (path === `${API_PATH}/submission/check-players`)
        step = "check-players";
      else if (path === `${API_PATH}/submission`) step = "submission";
      if (!step) {
        json(res, 404, { response: { failure: "unknown endpoint" } });
        return;
      }

      const call: EbuRecordedCall = {
        step,
        method,
        url: req.url ?? "",
        authorization,
        body,
      };
      if (step === "check-players" || step === "submission") {
        const raw = new URLSearchParams(body).get("data");
        if (raw) call.data = JSON.parse(raw);
      }
      recorded.push(call);

      if (mode === "unauthorized") {
        json(res, 401, { response: { failure: "Authorization required" } });
        return;
      }

      switch (step) {
        case "parse":
          json(res, 200, {
            response: { Session: { Players: PLAYERS.map((p) => ({ ...p })) } },
          });
          return;
        case "session-date":
          json(res, 200, { response: { Duplicates: duplicates, Sims: [] } });
          return;
        case "check-players": {
          const asked = (call.data ?? []) as Array<{
            ebu: string;
            surname: string;
          }>;
          json(res, 200, {
            response: {
              BadEBUs: 0,
              Mismatches: mismatch ? 1 : 0,
              Players: asked.map((p, i) =>
                mismatch && i === 0
                  ? { ...p, mismatch: 1, found_surname: "Someone" }
                  : { ...p, check: `chk-${p.ebu}` },
              ),
            },
          });
          return;
        }
        case "submission":
          json(
            res,
            200,
            mode === "rejected"
              ? { response: { failure: "Session rejected: duplicate event" } }
              : { response: { SessionID: "E2E-4242", warnings: [] } },
          );
          return;
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${address.port}`;

  return {
    apiBase: `${origin}${API_PATH}`,
    parseUrl: `${origin}${PARSE_PATH}`,
    setMode: (m) => {
      mode = m;
    },
    setDuplicates: (n) => {
      duplicates = n;
    },
    setPlayerMismatch: (on) => {
      mismatch = on;
    },
    calls: () => [...recorded],
    reset: () => {
      recorded = [];
      mode = "success";
      duplicates = 0;
      mismatch = false;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
