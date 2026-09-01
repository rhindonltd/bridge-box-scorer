import { NewPlayer } from "@/db/games/tables/players";
import { findPlayer } from "@/db/players/queries/find-player";
import { withBasicRoute } from "@/lib/api/basicRoute";
import { success } from "@/lib/api/success";

function isNumeric(query: string): boolean {
  return /^\d+$/.test(query.trim());
}

export const GET = withBasicRoute(async ({ req }) => {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length == 0) {
    return success([] as NewPlayer[]);
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

  return success(results);
});
