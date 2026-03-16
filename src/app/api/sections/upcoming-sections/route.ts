import { findUpcomingBridgeSections } from "@/db/queries";
import { NextResponse } from "next/server";

export interface UpcomingSection {
  sectionId: string;
  eventName: string;
  sectionName: string;
  sessionName: string;
}

export async function GET() {
  try {
    return findUpcomingBridgeSections().then((sections) =>
      NextResponse.json(sections),
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
