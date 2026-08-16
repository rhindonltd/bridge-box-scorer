import { NewPlayer } from "@/db/games/shared/tables/players";
import { findPlayer } from "@/db/players/queries/find-player";
import { NextRequest, NextResponse } from "next/server";

function isNumeric(query: string): boolean {
  return /^\d+$/.test(query.trim());
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length == 0) {
    return NextResponse.json([]);
  }

  let results: NewPlayer[] = [];

  if (isNumeric(q)) {
    results = (await findPlayer(Number(q))).map(
      (it) =>
        ({
          firstName: it.firstName,
          lastName: it.lastName,
          nationalId: String(it.ebuNumber),
        }) as NewPlayer,
    );
  }

  return NextResponse.json(results);
}
