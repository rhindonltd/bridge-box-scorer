import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { GameRouteContext, withGameRoute } from "@/lib/api/gameRoute";

const directorBodySchema = z
  .object({
    directorToken: z.string().min(1),
  })
  .passthrough();

export function withDirectorRoute(
  handler: (
    context: GameRouteContext & { body: Record<string, unknown> },
  ) => Promise<NextResponse>,
) {
  return withGameRoute(async (context) => {
    let rawBody: unknown;
    try {
      rawBody = await context.req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body" },
        { status: 400 },
      );
    }

    const parsed = directorBodySchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Missing or invalid director token" },
        { status: 400 },
      );
    }

    if (!validateDirectorToken(parsed.data.directorToken, context.gameId)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    return handler({
      ...context,
      body: parsed.data,
    });
  });
}
