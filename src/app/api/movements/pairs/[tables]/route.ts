import { NextResponse } from "next/server";
import { z } from "zod";
import { getPairMovementSpecsForTables } from "@/db/movements/queries";
import { success } from "@/lib/api/success";

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
    return success(await getPairMovementSpecsForTables(parsed.data));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
