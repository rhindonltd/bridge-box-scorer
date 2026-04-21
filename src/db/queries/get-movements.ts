import { getDb } from "@/db";
import {
    individualmovementspec,
    pairmovementspec,
    teammovementspec
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getIndividualMovementSpecsForTables(
    tables: number,
) {
    const db = await getDb();
    return db
        .select()
        .from(individualmovementspec)
        .where(eq(individualmovementspec.tables, tables));
}

export async function getPairMovementSpecsForTables(
    tables: number,
) {
    const db = await getDb();
    return db
        .select()
        .from(pairmovementspec)
        .where(eq(pairmovementspec.tables, tables));
}

export async function getTeamMovementSpecsForTables(
    tables: number,
) {
    const db = await getDb();
    return db
        .select()
        .from(teammovementspec)
        .where(eq(teammovementspec.tables, tables));
}
