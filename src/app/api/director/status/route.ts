import { NextResponse } from "next/server";
import { directorPasswordExists } from "@/db/system/queries/login-sessions";

export async function GET() {
  try {
    return NextResponse.json({
      passwordSet: await directorPasswordExists(),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
