import { NextRequest, NextResponse } from "next/server";
import { updateGameStatus } from "@/db/game-index/actions/update-game-status";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ sectionId: string }> },
) {
  const { sectionId } = await params;

  try {
    return (
      updateGameStatus(sectionId, 'STARTED')
        // Send to websocket
        .then(() => NextResponse.json({ success: true }))
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
