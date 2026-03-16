import { NextRequest, NextResponse } from "next/server";
import { getSectionsForSession } from "@/db/queries";

// Define GET using apiHandler
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  try {
    return NextResponse.json(await getSectionsForSession(sessionId));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
