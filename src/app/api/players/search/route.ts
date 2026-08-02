import { NewPlayer } from "@/db/games/shared/tables/players";
import { NextRequest, NextResponse } from "next/server";

const players = [
  {
    firstName: "Jacqui",
    lastName: "Collier",
    nationalId: "477484",
  },
  {
    firstName: "David",
    lastName: "Collier",
    nationalId: "404476",
  },
  {
    firstName: "John",
    lastName: "Smith",
    nationalId: "12269",
  },
  {
    firstName: "Jane",
    lastName: "Jones",
    nationalId: "16671",
  },
] as NewPlayer[];

function detectSearchType(query: string) {
  const trimmed = query.trim();

  // EBU numbers are normally numeric

  if (/^\d+$/.test(trimmed)) {
    return "ebu";
  }

  // // Club IDs usually contain letters
  //
  // if (/[a-z]/i.test(trimmed) && /\d/.test(trimmed)) {
  //     return "club";
  // }

  return "name";
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  const searchType = detectSearchType(q);

  let results = [];

  switch (searchType) {
    case "ebu":
      results = players.filter((player) => player.nationalId?.startsWith(q));
      break;

    // case "club":
    //     results = players.filter((player) =>
    //         player.clubId
    //             ?.toLowerCase()
    //             .includes(q.toLowerCase())
    //     );
    //     break;

    case "name":
      results = players.filter((player) =>
        `${player.firstName} ${player.lastName}`
          .toLowerCase()
          .includes(q.toLowerCase()),
      );
      break;
  }

  return NextResponse.json(results);
}
