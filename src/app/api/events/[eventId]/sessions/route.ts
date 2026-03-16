import { NextRequest, NextResponse } from "next/server";
import { findSessionsForEventId } from "@/db/queries";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  try {
    return NextResponse.json({
      sessions: await findSessionsForEventId(eventId),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
