import { NextRequest, NextResponse } from "next/server";
import type { Logger } from "pino";
import {
  resolveCorrelationId,
  requestLogger,
  withCorrelationHeader,
} from "@/lib/api/correlation";

export type BasicRouteContext<TParams = unknown> = {
  req: NextRequest;
  /**
   * Resolved dynamic route params for dynamic segments (e.g.
   * `[movementType]/[movementId]`). `undefined` for static routes. Next.js 16
   * hands params as a Promise on the route's second argument; the wrapper
   * awaits it so handlers receive a plain object.
   */
  params: TParams;
  /**
   * Request-scoped logger bound to this request's correlation id. Use it for
   * any logging inside the handler so lines correlate with the wrapper's
   * error log and the `x-correlation-id` response header.
   */
  log: Logger;
};

/**
 * Route wrapper for endpoints that don't require a game or admin context.
 * Provides a uniform try/catch → 500 envelope so handlers can throw on
 * infrastructure failures without leaking stack traces.
 *
 * Works for both static and dynamic routes: Next.js passes `{ params }` as the
 * second argument for dynamic segments, which the wrapper awaits and forwards
 * on `context.params`. Static-route handlers can ignore it.
 *
 * Correlation: reads or mints an `x-correlation-id`, binds it to `ctx.log`, and
 * echoes it on every response.
 */
export function withBasicRoute<TParams = unknown>(
  handler: (context: BasicRouteContext<TParams>) => Promise<NextResponse>,
) {
  return async (
    req: NextRequest,
    routeArg?: { params: Promise<TParams> },
  ) => {
    const correlationId = resolveCorrelationId(req);
    const log = requestLogger(correlationId);
    try {
      const params = (await routeArg?.params) as TParams;
      const res = await handler({ req, params, log });
      return withCorrelationHeader(res, correlationId);
    } catch (error) {
      log.error(
        { err: error, method: req.method, path: req.nextUrl?.pathname },
        "Unhandled error in basic route",
      );

      return withCorrelationHeader(
        NextResponse.json(
          { success: false, error: "Internal server error" },
          { status: 500 },
        ),
        correlationId,
      );
    }
  };
}
