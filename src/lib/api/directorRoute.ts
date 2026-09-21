import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { NextResponse } from "next/server";
import {
  GameRouteContext,
  GameRouteOptions,
  withGameRoute,
} from "@/lib/api/gameRoute";

export function withDirectorRoute<TBody = undefined>(
  handler: (context: GameRouteContext<TBody>) => Promise<NextResponse>,
  options: GameRouteOptions<TBody> = {},
) {
  // Body parsing happens AFTER the director-auth check below, not in
  // withGameRoute, so an unauthorized request still gets 401 even with a bad
  // body. withGameRoute therefore never sees the bodySchema.
  const { bodySchema } = options;

  return withGameRoute<TBody>(async (context) => {
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

    // Parse the body once here (post-auth) so routes drop the repeated
    // safeParse → 400 block. A non-JSON body is treated as an empty object,
    // matching the previous per-route `.catch(() => ({}))` behaviour.
    let body = context.body;
    if (bodySchema) {
      const parsed = bodySchema.safeParse(
        await context.req.json().catch(() => ({})),
      );
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: "Invalid request" },
          { status: 400 },
        );
      }
      body = parsed.data;
    }

    return handler({ ...context, body });
  });
}
