import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { boards } from "@/db/games/tables/boards";
import { withDirectorRoute } from "@/lib/api/directorRoute";
import { BoardOutcome } from "@/model/score";
import { success } from "@/lib/api/success";

const overrideSchema = z.object({
  roundNumber: z.number().int().min(1),
  tableNumber: z.number().int().min(1),
  result: z.string().min(1),
});

export const POST = withDirectorRoute(async ({ db, body, boardNumber }) => {
  const parsed = overrideSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  const { roundNumber, tableNumber, result } = parsed.data;

  await db
    .update(boards)
    .set({
      directorOverrideResult: result as BoardOutcome,
      status: "OVERRIDDEN",
    })
    .where(
      and(
        eq(boards.roundNumber, roundNumber),
        eq(boards.tableNumber, tableNumber),
        eq(boards.boardNumber, boardNumber!),
      ),
    );

  return success({});
});
