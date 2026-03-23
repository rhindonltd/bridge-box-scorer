import { getMovementSpecsForNumberOfTables } from "@/db/queries/get-movements";

export default async function MovementsPage() {
  const movements = await getMovementSpecsForNumberOfTables(6);

  return <pre>{JSON.stringify(movements, null, 2)}</pre>;
}
