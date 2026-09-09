import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { NextResponse } from "next/server";
import { GameRouteContext, withGameRoute } from "@/lib/api/gameRoute";

export function withDirectorRoute(
  handler: (context: GameRouteContext) => Promise<NextResponse>,
) {
  return withGameRoute(async (context) => {
    // Director-authed HTTP routes take the token from the `x-director-token`
    // header. This is the single supported source: it works uniformly for GET
    // downloads (e.g. USEBIO, which can't carry a request body) and mutating
    // calls (e.g. DELETE), so routes don't need a body just to carry the token.
    const directorToken = context.req.headers.get("x-director-token");

    if (!validateDirectorToken(directorToken, context.gameId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    return handler(context);
  });
}
