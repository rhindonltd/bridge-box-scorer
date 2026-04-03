"use server";

import { getDb } from "@/db";
import { Setting, settings } from "@/db/schema";

export async function updateSetting(item: Setting) {
  const db = await getDb();
  await db
    .insert(settings)
    .values(item)
    .onConflictDoUpdate({
      target: settings.settingKey,
      set: {
        settingValue: item.settingValue,
      },
    });
}
