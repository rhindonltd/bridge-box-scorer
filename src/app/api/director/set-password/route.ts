import { NextResponse } from "next/server";
import {
  setDirectorPassword,
  directorPasswordExists,
} from "@/server/auth/directorAuth";

export async function POST(req: Request) {
  const { password } = await req.json();

  if (directorPasswordExists()) {
    return NextResponse.json(
      { error: "Password already set" },
      { status: 400 },
    );
  }

  await setDirectorPassword(password);

  return NextResponse.json({ success: true });
}
