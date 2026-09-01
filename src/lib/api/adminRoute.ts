import { NextRequest, NextResponse } from "next/server";
import { validateAdminToken } from "@/db/system/queries/admin-key";

export type AdminRouteContext = {
  req: NextRequest;
};

/**
 * Wrapper for device/admin API routes. Requires a valid admin session token in
 * the `x-admin-token` header (minted by the admin-key verify endpoint). The
 * admin key itself is never sent on these calls — only the session token.
 */
export function withAdminRoute(
  handler: (context: AdminRouteContext) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
      const token = req.headers.get("x-admin-token");

      if (!(await validateAdminToken(token))) {
        return NextResponse.json(
          { success: false, error: "Unauthorized" },
          { status: 401 },
        );
      }

      return handler({ req });
    } catch (error) {
      console.error(error);

      return NextResponse.json(
        { success: false, error: "Internal server error" },
        { status: 500 },
      );
    }
  };
}
