import { Player, players } from "../schema";
import { getDb } from "../index";
import { eq } from "drizzle-orm";

export async function findPlayer(ebuNumber: number): Promise<Player[]> {
  const db = await getDb();

  return db.select().from(players).where(eq(players.ebuNumber, ebuNumber));
}
