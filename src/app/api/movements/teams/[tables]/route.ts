import { NextResponse } from "next/server";
import { z } from "zod";
import { getTeamMovementSpecsForTables } from "@/db/movements/queries";

const tablesSchema = z.coerce.number().int().min(1);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tables: string }> },
) {
  const parsed = tablesSchema.safeParse((await params).tables);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid table count" },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(
      await getTeamMovementSpecsForTables(parsed.data),
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
