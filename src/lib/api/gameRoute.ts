import { NextResponse } from "next/server";
import { z } from "zod";
import { Db, getDb } from "@/db/games";

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
};

export function withGameRoute(
  handler: (context: GameRouteContext) => Promise<NextResponse>,
) {
  return async (req: Request, { params }: { params: Promise<RouteParams> }) => {
    try {
      const { gameId, boardNumber, seat } = await params;

      let parsedBoardNumber: number | null = null;
      if (boardNumber !== undefined) {
        const result = boardNumberSchema.safeParse(boardNumber);
        if (!result.success) {
          return NextResponse.json(
            { success: false, error: "Invalid board number" },
            { status: 400 },
          );
        }
        parsedBoardNumber = result.data;
      }

      const db = await getDb(gameId);

      if (!db) {
        return NextResponse.json(
          { success: false, error: "Game not found" },
          { status: 404 },
        );
      }

      return handler({
        req,
        gameId,
        boardNumber: parsedBoardNumber,
        seat: seat ?? null,
        db,
      });
    } catch (error) {
      console.error(error);

      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
