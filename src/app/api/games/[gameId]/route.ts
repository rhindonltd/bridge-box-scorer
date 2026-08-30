import { NextResponse } from "next/server";
import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { withGameRoute } from "@/lib/api/gameRoute";

export const GET = withGameRoute(async ({ gameId }) => {
    return NextResponse.json({ success: true, result: { game: await findGameById(gameId) }});
});
