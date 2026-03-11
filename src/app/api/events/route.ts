import { NextResponse } from "next/server";
import db from "@/db";

type Event = {
  id: string;
  event_name: string;
};

export async function GET() {
  try {
    const rows: Event[] = db
      .prepare("SELECT id, event_name FROM events ORDER BY created_at DESC")
      .all() as Event[];

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Failed to fetch events:", err);
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 },
    );
  }
}
