import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { childLogger } from "@/lib/log";
import type { Logger } from "pino";

/** Header carrying the request correlation id, in and out. */
export const CORRELATION_HEADER = "x-correlation-id";

/**
 * Resolve the correlation id for a request: reuse an incoming
 * `x-correlation-id` header if the caller supplied one (so a client-initiated
 * id threads through), otherwise mint a fresh UUID. Every HTTP route wrapper
 * stamps this on its child logger and echoes it back on the response, so a
 * single request's logs — and the client's copy — can be correlated.
 */
export function resolveCorrelationId(req: {
  headers: { get(name: string): string | null };
}): string {
  return req.headers.get(CORRELATION_HEADER) ?? randomUUID();
}

/** A request-scoped child logger bound to the correlation id. */
export function requestLogger(correlationId: string): Logger {
  return childLogger({ correlationId });
}

/**
 * Echo the correlation id back on the response so the caller can see (and log)
 * the same id the server used. Returns the response for chaining.
 */
export function withCorrelationHeader<T extends NextResponse>(
  res: T,
  correlationId: string,
): T {
  res.headers.set(CORRELATION_HEADER, correlationId);
  return res;
}
