import { getTeamMovementSpecsForTables } from "@/db/movements/queries";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tables: string }> },
) {
  const tables = (await params).tables;

  try {
    return Response.json(await getTeamMovementSpecsForTables(Number(tables)));
  } catch (error) {
    console.error(error);
    return Response.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
