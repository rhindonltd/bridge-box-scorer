import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const metadata = sqliteTable("metadata", {
  id: text("id").primaryKey(),
  movementType: text("movement_type").notNull(),
  boardsPerRound: integer("boards_per_round").notNull(),
  rounds: integer("rounds").notNull(),
  bridgeTables: integer("bridge_tables").notNull(),
});

export type Metadata = typeof metadata.$inferSelect;
