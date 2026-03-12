"use server";

import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function findSetting(key: string): Promise<string | null> {
  const rows = await db
    .select({ value: settings.settingValue })
    .from(settings)
    .where(eq(settings.settingKey, key))
    .limit(1);

  return rows[0]?.value ?? null;
}
