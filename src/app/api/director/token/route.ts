import { NextRequest, NextResponse } from "next/server";
import { findLoginSession } from "@/db/system/queries/find-login-session";

/**
 * Returns the director token for the current session so that the client can
 * pass it as Socket.IO handshake auth. Only succeeds when a valid director
 * cookie is present.
 */
export async function GET(req: NextRequest) {
  const token = req.cookies.get("directorToken")?.value;

  if (!token) {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  const session = findLoginSession(token);
  if (!session || session.role !== "DIRECTOR") {
    return NextResponse.json({ success: false }, { status: 401 });
  }

  return NextResponse.json({ success: true, token });
}
