import { NextRequest, NextResponse } from "next/server";
import type { Logger } from "pino";
import { validateAdminToken } from "@/db/system/queries/admin-key";
import {
  resolveCorrelationId,
  requestLogger,
  withCorrelationHeader,
} from "@/lib/api/correlation";

export type AdminRouteContext = {
  req: NextRequest;
  /** Request-scoped logger bound to this request's correlation id. */
  log: Logger;
};

/**
 * Wrapper for device/admin API routes. Requires a valid admin session token in
 * the `x-admin-token` header (minted by the admin-key verify endpoint). The
 * admin key itself is never sent on these calls — only the session token.
 *
 * Correlation: reads or mints an `x-correlation-id`, binds it to `ctx.log`, and
 * echoes it on every response.
 */
export function withAdminRoute(
  handler: (context: AdminRouteContext) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    const correlationId = resolveCorrelationId(req);
    const log = requestLogger(correlationId);
    try {
      const token = req.headers.get("x-admin-token");

      if (!(await validateAdminToken(token))) {
        return withCorrelationHeader(
          NextResponse.json(
            { success: false, error: "Unauthorized" },
            { status: 401 },
          ),
          correlationId,
        );
      }

      const res = await handler({ req, log });
      return withCorrelationHeader(res, correlationId);
    } catch (error) {
      log.error(
        { err: error, method: req.method, path: req.nextUrl?.pathname },
        "Unhandled error in admin route",
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
