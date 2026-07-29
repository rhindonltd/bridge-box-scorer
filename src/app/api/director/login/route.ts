import { NextRequest, NextResponse } from "next/server";
import { verifyDirectorPassword } from "@/db/system/queries/login-sessions";
import { createLoginSession } from "@/db/system/actions/create-login-session";
import { z } from "zod";

const loginSchema = z.object({
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Password is required" },
      { status: 400 },
    );
  }

  const { password } = parsed.data;

  const valid = await verifyDirectorPassword(password);
  if (!valid) return NextResponse.json({ success: false }, { status: 401 });

  const loginSession = {
    token: crypto.randomUUID(),
    gameId: null,
    role: "DIRECTOR",
  };
  await createLoginSession(loginSession);

  const response = NextResponse.json({ success: true });
  response.cookies.set("directorToken", loginSession.token, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
  });

  return response;
}
