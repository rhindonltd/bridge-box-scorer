import "server-only";

import { getDb } from "@/db/games";
import { sections } from "@/db/games/tables/sections";

export interface CreateSectionInput {
  section: string;
  label?: string;
  tables: number;
  ordinal?: number;
}

/**
 * Create a new section. Section letters must be unique within a game. When no
 * label is given it defaults to the section letter; when no ordinal is given it
 * is appended after the existing sections.
 */
export async function createSection(
  gameId: string,
  input: CreateSectionInput,
): Promise<void> {
  const db = await getDb(gameId);

  if (!db) {
    throw new Error("Game db does not exist");
  }

  const existing = await db.select().from(sections);

  if (existing.some((s) => s.section === input.section)) {
    throw new Error(`Section ${input.section} already exists`);
  }

  const ordinal =
    input.ordinal ??
    (existing.length === 0
      ? 0
      : Math.max(...existing.map((s) => s.ordinal)) + 1);

  await db.insert(sections).values({
    section: input.section,
    label: input.label ?? input.section,
    tables: input.tables,
    selectedMovement: null,
    ordinal,
  });
}
