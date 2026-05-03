import { getDb } from "@/db/players";
import { players, Player } from "@/db/players/schema";
import { sql, inArray } from "drizzle-orm";

type DB = Awaited<ReturnType<typeof getDb>>;

export async function syncPlayers(playersData: Player[]) {
    const db = await getDb();

    await upsertPlayers(playersData, db);
    await deleteMissingPlayers(playersData, db);
}

async function upsertPlayers(playersData: Player[], db: DB) {
    const chunkSize = 1000;

    for (let i = 0; i < playersData.length; i += chunkSize) {
        const chunk = playersData.slice(i, i + chunkSize);

        await db
            .insert(players)
            .values(chunk)
            .onConflictDoUpdate({
                target: players.ebuNumber,
                set: {
                    firstName: sql`excluded.first_name`,
                    lastName: sql`excluded.last_name`,
                },
                where: sql`
                    ${players.firstName} IS DISTINCT FROM excluded.first_name
                    OR ${players.lastName} IS DISTINCT FROM excluded.last_name
                `,
            });
    }
}

async function deleteMissingPlayers(playersData: Player[], db: DB) {
    const incomingIds = playersData.map((p) => p.ebuNumber);

    const existing = await db
        .select({ id: players.ebuNumber })
        .from(players);

    const existingIds = existing.map((r) => r.id);

    const incomingSet = new Set(incomingIds);

    const toDelete = existingIds.filter(
        (id): id is number => id !== null && !incomingSet.has(id)
    );

    if (toDelete.length === 0) return;

    const chunkSize = 500;

    for (let i = 0; i < toDelete.length; i += chunkSize) {
        const chunk = toDelete.slice(i, i + chunkSize);

        await db
            .delete(players)
            .where(inArray(players.ebuNumber, chunk));
    }
}
