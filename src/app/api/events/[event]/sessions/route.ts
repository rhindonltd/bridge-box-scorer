import db from "@/db";
import { NextRequest, NextResponse } from "next/server";

type Session = {
  id: string;
  session_name: string;
};

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ event: string }>;
  },
) {
  const { event } = await params;

  try {
    const rows: Session[] = db
      .prepare(
        `SELECT id, session_name FROM sessions WHERE event_id = '${event}' ORDER BY session_name`,
      )
      .all() as Session[];

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Failed to fetch sessions:", err);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
