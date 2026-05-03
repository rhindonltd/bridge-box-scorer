import { NextResponse } from "next/server";
import {
  directorPasswordExists,
  setDirectorPassword,
} from "@/db/system/queries/login-sessions";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (await directorPasswordExists()) {
    return NextResponse.json(
      { error: "Password already set" },
      { status: 400 },
    );
  }

  await setDirectorPassword(password);

  return NextResponse.json({ success: true });
}
