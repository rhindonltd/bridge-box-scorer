import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/* loginsessions */
export const loginSessions = sqliteTable("loginsessions", {
  token: text("token").primaryKey(),
  gameId: text("gameId"),
  role: text("role").notNull(),
});

export type LoginSession = typeof loginSessions.$inferSelect;

/* settings */
export const settings = sqliteTable("settings", {
  settingKey: text("setting_key").primaryKey(),
  settingValue: text("setting_value").notNull(),
});

export type Setting = typeof settings.$inferSelect;

/* club */
export const club = sqliteTable("club", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull(),
  clubNumber: text("club_number").notNull(),
});

export type Club = typeof club.$inferSelect;
export type NewClub = typeof club.$inferInsert;

/* share_codes — short-lived codes for director handoff */
export const shareCodes = sqliteTable("share_codes", {
  code: text("code").primaryKey(),
  gameId: text("game_id").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: integer("used").notNull().default(0),
});

export type ShareCode = typeof shareCodes.$inferSelect;
export type NewShareCode = typeof shareCodes.$inferInsert;
