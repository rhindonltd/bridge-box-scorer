import { NextRequest, NextResponse } from "next/server";
import { verifyDirectorPassword } from "@/db/queries/login-sessions";
import { createLoginSession } from "@/db/actions/create-login-session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { password } = body;

  const valid = await verifyDirectorPassword(password);
  if (!valid) return NextResponse.json({ success: false }, { status: 401 });

  const loginSession = { token: crypto.randomUUID(), director: true };
  await createLoginSession(loginSession);

  const response = NextResponse.json({
    success: true,
    token: loginSession.token,
  });
  response.cookies.set("directorToken", loginSession.token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });

  return response;
}
