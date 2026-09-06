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
    // The director token may arrive in the `x-director-token` header (used by
    // GET downloads like USEBIO, which have no request body) or in the JSON
    // body (used by mutating calls such as DELETE). Prefer the header; fall
    // back to the body only when the header is absent.
    const headerToken = context.req.headers.get("x-director-token");

    let body: Record<string, unknown> = {};
    let directorToken: string | undefined;

    if (headerToken) {
      directorToken = headerToken;
    } else {
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

      body = parsed.data;
      directorToken = parsed.data.directorToken;
    }

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
