import db from "@/db";
import { NextRequest, NextResponse } from "next/server";

type Section = {
  id: string;
  section_name: string;
  bridge_tables: number;
};

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ session: string }>;
  },
) {
  const { session } = await params;

  try {
    const rows: Section[] = db
      .prepare(
        `SELECT id, section_name, bridge_tables FROM sections WHERE session_id = '${session}' ORDER BY section_name`,
      )
      .all() as Section[];

    return NextResponse.json(rows);
  } catch (err) {
    console.error("Failed to fetch sections:", err);
    return NextResponse.json(
      { error: "Failed to fetch sections" },
      { status: 500 },
    );
  }
}
