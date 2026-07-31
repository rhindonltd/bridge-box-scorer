import { NextResponse } from "next/server";
import { findClub } from "@/db/system/queries/find-club";
import { upsertClub } from "@/db/system/actions/upsert-club";

export async function GET() {
  try {
    const club = await findClub();
    return NextResponse.json({ club });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, clubNumber } = body;

    if (!name || !clubNumber) {
      return NextResponse.json(
        { success: false, error: "Club name and number are required" },
        { status: 400 },
      );
    }

    await upsertClub(name, clubNumber);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
