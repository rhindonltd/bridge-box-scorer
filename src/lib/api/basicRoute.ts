import { NextRequest, NextResponse } from "next/server";

export type BasicRouteContext = {
  req: NextRequest;
};

export function withBasicRoute(
  handler: (context: BasicRouteContext) => Promise<NextResponse>,
) {
  return async (req: NextRequest) => {
    try {
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
