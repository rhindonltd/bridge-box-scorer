import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const pairmovementspec = sqliteTable("pairmovementspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  tables: integer("tables").notNull(),
  boards: integer("boards").notNull(),
  boardsPerRound: integer("boards_per_round").notNull(),
  rounds: integer("rounds").notNull(),
  missingPair: integer("missing_pair"),
});

export type NewPairMovementSpec = typeof pairmovementspec.$inferInsert;
export type PairMovementSpec = typeof pairmovementspec.$inferSelect;

export const pairmovementtablespec = sqliteTable("pairmovementtablespec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  movementId: integer("movement_id")
    .references(() => pairmovementspec.id)
    .notNull(),
  tableNumber: integer("table_number").notNull(),
});

export type NewPairMovementTableSpec =
  typeof pairmovementtablespec.$inferInsert;
export type PairMovementTableSpec = typeof pairmovementtablespec.$inferSelect;

export const pairmovementroundspec = sqliteTable("pairmovementroundspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id").references(() => pairmovementtablespec.id),
  roundNumber: integer("round_number").notNull(),
  ns: text("ns").notNull(),
  ew: text("ew").notNull(),
  boardStart: integer("board_start").notNull(),
  boardEnd: integer("board_end").notNull(),
});

export type NewPairMovementRoundSpec =
  typeof pairmovementroundspec.$inferInsert;
export type PairMovementRoundSpec = typeof pairmovementroundspec.$inferSelect;

export const teammovementspec = sqliteTable("teammovementspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  tables: integer("tables").notNull(),
  boards: integer("boards").notNull(),
  boardsPerRound: integer("boards_per_round").notNull(),
  rounds: integer("rounds").notNull(),
});

export type NewTeamMovementSpec = typeof teammovementspec.$inferInsert;
export type TeamMovementSpec = typeof teammovementspec.$inferSelect;

export const teammovementtablespec = sqliteTable("teammovementtablespec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  movementId: integer("movement_id")
    .references(() => teammovementspec.id)
    .notNull(),
  tableNumber: integer("table_number").notNull(),
});

export type NewTeamMovementTableSpec =
  typeof teammovementtablespec.$inferInsert;
export type TeamMovementTableSpec = typeof teammovementtablespec.$inferSelect;

export const teammovementroundspec = sqliteTable("teammovementroundspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id").references(() => teammovementtablespec.id),
  roundNumber: integer("round_number").notNull(),
  ns: text("ns").notNull(),
  ew: text("ew").notNull(),
  boardStart: integer("board_start").notNull(),
  boardEnd: integer("board_end").notNull(),
});

export type NewTeamMovementRoundSpec =
  typeof teammovementroundspec.$inferInsert;
export type TeamMovementRoundSpec = typeof teammovementroundspec.$inferSelect;
