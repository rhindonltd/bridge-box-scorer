import { sqliteTable, integer, unique, text } from "drizzle-orm/sqlite-core";
import { players } from "@/db/games/tables/players";
import { PairSeat } from "@/model/participants";

export const participants = sqliteTable(
  "participant",
  {
    initialSeat: text("initial_seat").$type<PairSeat>().primaryKey(),
    player1: integer("player1")
      .references(() => players.id)
      .notNull(),
    player2: integer("player2")
      .references(() => players.id)
      .notNull(),
    secretKey: text("secret_key").notNull(),
  },
  (table) => ({
    uniquePair: unique().on(table.player1, table.player2),
  }),
);

export type Participant = typeof participants.$inferSelect;
