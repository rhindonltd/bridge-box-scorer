import { getPairMovementSpecsForTables } from "@/db/movements/queries/get-movements";

export default async function MovementsPage() {
  const movements = await getPairMovementSpecsForTables(6);

  return <pre>{JSON.stringify(movements, null, 2)}</pre>;
}
