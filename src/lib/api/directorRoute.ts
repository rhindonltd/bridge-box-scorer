import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { NextResponse } from "next/server";
import { GameRouteContext, withGameRoute } from "@/lib/api/gameRoute";

export function withDirectorRoute(
  handler: (
    context: GameRouteContext & { body: unknown },
  ) => Promise<NextResponse>,
) {
  return withGameRoute(async (context) => {
    const body = await context.req.json();

    const { directorToken } = body as {
      directorToken?: string;
    };

    if (!validateDirectorToken(directorToken, context.gameId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    return handler({
      ...context,
      body,
    });
  });
}
