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

/* seat_transfer_codes — short-lived codes for moving a seat to another device.
 * Like share_codes but bound to a specific seat. The `kind` records the claim's
 * intent, decided when the code is MINTED (not inferred from the seat's state):
 *   - CHANGE_DEVICE: the SAME pair moves to a new device — claiming just rotates
 *     the seat's secret so only the new device retains access (no names).
 *   - HANDOVER: a DIFFERENT (arriving) pair takes over the seat — claiming runs
 *     the handover engine and requires the arriving pair's names.
 * Plain TEXT with a CHANGE_DEVICE default, so existing rows stay valid. */
export const seatTransferCodes = sqliteTable("seat_transfer_codes", {
  code: text("code").primaryKey(),
  gameId: text("game_id").notNull(),
  seat: text("seat").notNull(),
  expiresAt: text("expires_at").notNull(),
  used: integer("used").notNull().default(0),
  kind: text("kind", { enum: ["CHANGE_DEVICE", "HANDOVER", "REINSTATE"] })
    .notNull()
    .default("CHANGE_DEVICE"),
});

export type SeatTransferCode = typeof seatTransferCodes.$inferSelect;
export type NewSeatTransferCode = typeof seatTransferCodes.$inferInsert;
