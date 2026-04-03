import { NextResponse } from "next/server";
import { findUpcomingBridgeSections } from "@/db/queries";

export interface UpcomingSection {
  sectionId: string;
  eventName: string;
  sectionName: string;
  sessionName: string;
}

export async function GET() {
  try {
    const sections: UpcomingSection[] = await findUpcomingBridgeSections();
    return NextResponse.json(sections);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
