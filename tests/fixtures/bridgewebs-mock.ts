import http from "node:http";
import { AddressInfo } from "node:net";

/**
 * A stand-in for the real BridgeWebs HTTP API, for E2E tests.
 *
 * The app uploads results by POSTing form-encoded fields to the BridgeWebs
 * endpoint (`.../api.cgi?club=<code>`) FROM THE SERVER PROCESS and parsing a
 * plaintext reply whose `message = ...` line signals success/failure. That
 * outbound call cannot be intercepted by Playwright's browser-level routing, so
 * instead we run this real (local) HTTP server and point the app at it via the
 * `BRIDGEWEBS_API_BASE` env override (see `src/lib/bridgewebs/client.ts`).
 *
 * The server:
 *  - replies with a BridgeWebs-style body (`message = Upload Successful` by
 *    default; a failure message when `setReply("failure")` is set), and
 *  - records the last request's URL + parsed form fields so a test can assert
 *    the app sent the right payload (type=upload, club, filename, dealname, …).
 */

export type MockReplyMode = "success" | "failure";

/** A calendar event the mock reports for an events download. */
export interface MockEvent {
  id: string;
  title: string;
}

export interface RecordedRequest {
  /** The request URL path + query (e.g. `/cgi-bin/bwx/api.cgi?club=e2eclub`). */
  url: string;
  /** The parsed form fields from the request body. */
  fields: Record<string, string>;
}

export interface BridgewebsMock {
  /** The base URL to hand the app via `BRIDGEWEBS_API_BASE`. */
  baseUrl: string;
  /** Switch the UPLOAD reply between a success and a failure message. */
  setReply: (mode: MockReplyMode) => void;
  /** Set the events returned for an events-download request. */
  setEvents: (events: MockEvent[]) => void;
  /** The most recent request the app made, or null if none yet. */
  lastRequest: () => RecordedRequest | null;
  /** Forget the last recorded request (call between assertions). */
  reset: () => void;
  /** Shut the server down. */
  close: () => Promise<void>;
}

const SUCCESS_BODY = "message = Upload Successful\n";
const FAILURE_BODY = "message = Upload failed: invalid club or password\n";

/**
 * Build the plaintext body BridgeWebs returns for an events download: a
 * `json = {...}` line carrying the day's events keyed by id, in the shape the
 * client's `parseEventsResponse` expects.
 */
function eventsBody(events: MockEvent[]): string {
  const payload = {
    events: Object.fromEntries(
      events.map((e) => [e.id, { title: e.title, file: `${e.id}.htm` }]),
    ),
  };
  return `message = Download Successful\njson = ${JSON.stringify(payload)}\n`;
}

/**
 * The port the mock should listen on, derived from `BRIDGEWEBS_API_BASE` so it
 * always matches whatever the app server was pointed at (set in
 * playwright.config.ts). Falls back to 3999 if the env var is unset or has no
 * explicit port.
 */
export function bridgewebsMockPort(): number {
  const base = process.env.BRIDGEWEBS_API_BASE;
  if (base) {
    try {
      const parsed = new URL(base);
      if (parsed.port) return Number(parsed.port);
    } catch {
      // Fall through to the default on a malformed URL.
    }
  }
  return 3999;
}

/**
 * Start the mock BridgeWebs server and resolve once it is listening. The port
 * defaults to whatever `BRIDGEWEBS_API_BASE` specifies (see
 * {@link bridgewebsMockPort}), so the mock always listens exactly where the app
 * server's BridgeWebs client will POST.
 */
export async function startBridgewebsMock(
  port = bridgewebsMockPort(),
): Promise<BridgewebsMock> {
  let mode: MockReplyMode = "success";
  let events: MockEvent[] = [];
  let recorded: RecordedRequest | null = null;

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c as Buffer));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const params = new URLSearchParams(body);
      const fields: Record<string, string> = {};
      for (const [key, value] of params.entries()) fields[key] = value;
      recorded = { url: req.url ?? "", fields };

      res.writeHead(200, { "Content-Type": "text/plain" });

      // An events download (create-page picker) asks for the day's calendar
      // events; everything else is treated as a results upload.
      if (fields.type === "download" && fields.transfer === "events") {
        res.end(eventsBody(events));
        return;
      }

      res.end(mode === "success" ? SUCCESS_BODY : FAILURE_BODY);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;
  // The client appends `?club=...`; the path segment mirrors the real API so
  // recorded URLs look realistic, but only the origin actually matters here.
  const baseUrl = `http://127.0.0.1:${address.port}/cgi-bin/bwx/api.cgi`;

  return {
    baseUrl,
    setReply: (m) => {
      mode = m;
    },
    setEvents: (e) => {
      events = e;
    },
    lastRequest: () => recorded,
    reset: () => {
      recorded = null;
    },
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((err) => (err ? reject(err) : resolve())),
      ),
  };
}
