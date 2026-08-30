import { findPairs } from "@/db/games/queries/find-pairs";
import { withGameRoute } from "@/lib/api/gameRoute";
import { NextResponse } from "next/server";

export const GET = withGameRoute(async ({ db }) => {
    return NextResponse.json({ success: true, result: { pairs: await findPairs(db) }});
});
