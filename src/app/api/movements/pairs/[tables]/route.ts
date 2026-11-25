import { NextResponse } from "next/server";
import { z } from "zod";
import { listPairMovements } from "@/modules/movement-catalog/server";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";

const tablesSchema = z.coerce.number().int().min(1);

export const GET = withBasicRoute<{ tables: string }>(async ({ params }) => {
  const parsed = tablesSchema.safeParse(params.tables);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Invalid table count" },
      { status: 400 },
    );
  }

  // Query failures fall through to withBasicRoute's try/catch → 500.
  return success(await listPairMovements(parsed.data));
});
