import bcrypt from "bcrypt";
import db from "../../db";

const PASSWORD_KEY = "director_password_hash";

export function directorPasswordExists(): boolean {
  const row = db
    .prepare(`SELECT setting_value FROM settings WHERE setting_key = ?`)
    .get(PASSWORD_KEY) as { setting_value: string } | undefined;

  return !!row;
}

export async function setDirectorPassword(password: string): Promise<void> {
  const hash = await bcrypt.hash(password, 10);

  db.prepare(
    `
    INSERT OR REPLACE INTO settings (setting_key, setting_value)
    VALUES (?, ?)
  `,
  ).run(PASSWORD_KEY, hash);
}

export async function verifyDirectorPassword(
  password: string,
): Promise<boolean> {
  const row = db
    .prepare(`SELECT setting_value FROM settings WHERE setting_key = ?`)
    .get(PASSWORD_KEY) as { setting_value: string } | undefined;

  if (!row) return false;

  return bcrypt.compare(password, row.setting_value);
}
