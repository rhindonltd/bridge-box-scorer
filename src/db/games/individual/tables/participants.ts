import { players } from "@/db/games/shared/tables/players";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { IndividualSeat } from "@/model/participants";

export const participants = sqliteTable("participant", {
  initialSeat: text("initial_seat").$type<IndividualSeat>().primaryKey(),
  player: integer("player")
    .notNull()
    .references(() => players.id),
  secretKey: text("secret_key").notNull(),
});

export type Participant = typeof participants.$inferSelect;
