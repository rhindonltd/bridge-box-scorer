"use server";

import { db } from "@/db";
import { loginSessions, settings } from "@/db/schema";
import bcrypt from "bcrypt";
import { findSetting } from "@/db/queries/settings";
import { eq } from "drizzle-orm";

const PASSWORD_KEY = "director_password_hash";

export async function directorPasswordExists(): Promise<boolean> {
  return (await findSetting(PASSWORD_KEY)) !== null;
}

export async function setDirectorPassword(password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 10);

  await db
    .insert(settings)
    .values({
      settingKey: PASSWORD_KEY,
      settingValue: hash,
    })
    .onConflictDoUpdate({
      target: settings.settingKey,
      set: { settingValue: hash },
    });
}

export async function verifyDirectorPassword(
  password: string,
): Promise<boolean> {
  const hash = await findSetting(PASSWORD_KEY);
  if (!hash) return false;

  return bcrypt.compare(password, hash);
}

export async function isDirector(token: string) {
  return (
    db.select().from(loginSessions).where(eq(loginSessions.token, token)) !==
    null
  );
}
