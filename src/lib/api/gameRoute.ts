import { NextResponse } from "next/server";
import { z } from "zod";
import type { Logger } from "pino";
import { Db, getDb } from "@/db/games";
import {
  resolveCorrelationId,
  requestLogger,
  withCorrelationHeader,
} from "@/lib/api/correlation";

const boardNumberSchema = z.coerce.number().int().min(1);

export type RouteParams = {
  gameId: string;
  boardNumber?: string;
  seat?: string;
  section?: string;
};

export type GameRouteContext<TBody = undefined> = {
  req: Request;
  gameId: string;
  boardNumber: number | null;
  seat: string | null;
  section: string | null;
  db: Db;
  /** The parsed request body when the route declared a `bodySchema`. */
  body: TBody;
  /** Request-scoped logger bound to this request's correlation id. */
  log: Logger;
};

export type GameRouteOptions<TBody> = {
  /**
   * When provided, the wrapper parses the JSON body against this schema and
   * responds with a uniform 400 "Invalid request" on failure, so routes don't
   * repeat the safeParse → 400 block. The parsed value is passed to the handler
   * as `context.body`. A body that isn't valid JSON is treated as an empty
   * object, matching the previous per-route `.catch(() => ({}))` behaviour.
   */
  bodySchema?: z.ZodType<TBody>;
};

export function withGameRoute<TBody = undefined>(
  handler: (context: GameRouteContext<TBody>) => Promise<NextResponse>,
  options: GameRouteOptions<TBody> = {},
) {
  return async (req: Request, { params }: { params: Promise<RouteParams> }) => {
    const correlationId = resolveCorrelationId(req);
    const log = requestLogger(correlationId);
    let gameId: string | undefined;
    try {
      const resolved = await params;
      gameId = resolved.gameId;
      const { boardNumber, seat, section } = resolved;

      let parsedBoardNumber: number | null = null;
      if (boardNumber !== undefined) {
        const result = boardNumberSchema.safeParse(boardNumber);
        if (!result.success) {
          return withCorrelationHeader(
            NextResponse.json(
              { success: false, error: "Invalid board number" },
              { status: 400 },
            ),
            correlationId,
          );
        }
        parsedBoardNumber = result.data;
      }

      let body = undefined as TBody;
      if (options.bodySchema) {
        const parsed = options.bodySchema.safeParse(
          await req.json().catch(() => ({})),
        );
        if (!parsed.success) {
          return withCorrelationHeader(
            NextResponse.json(
              { success: false, error: "Invalid request" },
              { status: 400 },
            ),
            correlationId,
          );
        }
        body = parsed.data;
      }

      const db = await getDb(gameId);

      if (!db) {
        return withCorrelationHeader(
          NextResponse.json(
            { success: false, error: "Game not found" },
            { status: 404 },
          ),
          correlationId,
        );
      }

      const res = await handler({
        req,
        gameId,
        boardNumber: parsedBoardNumber,
        seat: seat ?? null,
        section: section ?? null,
        db,
        body,
        log,
      });
      return withCorrelationHeader(res, correlationId);
    } catch (error) {
      log.error(
        { err: error, gameId, method: req.method },
        "Unhandled error in game route",
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
