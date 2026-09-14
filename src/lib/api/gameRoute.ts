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
};

export type GameRouteContext = {
  req: Request;
  gameId: string;
  boardNumber: number | null;
  seat: string | null;
  db: Db;
  /** Request-scoped logger bound to this request's correlation id. */
  log: Logger;
};

export function withGameRoute(
  handler: (context: GameRouteContext) => Promise<NextResponse>,
) {
  return async (req: Request, { params }: { params: Promise<RouteParams> }) => {
    const correlationId = resolveCorrelationId(req);
    const log = requestLogger(correlationId);
    let gameId: string | undefined;
    try {
      const resolved = await params;
      gameId = resolved.gameId;
      const { boardNumber, seat } = resolved;

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
        db,
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
