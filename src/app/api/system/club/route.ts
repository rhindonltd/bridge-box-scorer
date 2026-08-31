import { NextResponse } from "next/server";
import { findClub } from "@/db/system/queries/find-club";
import { upsertClub } from "@/db/system/actions/upsert-club";
import { z } from "zod";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success"

export const GET = withBasicRoute(async () => {
  return success({ club: await findClub() });
});

export const POST = withBasicRoute(async ({ req }) => {
  const body = await req.json();

  const schema = z.object({
    name: z.string(),
    clubNumber: z.string(),
  });

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
      },
      { status: 400 },
    );
  }

  await upsertClub(parsed.data.name, parsed.data.clubNumber);
  return success({});
});
