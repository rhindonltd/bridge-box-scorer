"use server";

import { db } from "@/db";
import { Setting, settings } from "@/db/schema";

export async function updateSetting(item: Setting) {
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
