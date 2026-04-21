import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const individualmovementspec = sqliteTable("individualmovementspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  tables: integer("tables").notNull(),
  boards: integer("boards").notNull(),
  boardsPerRound: integer("boards_per_round").notNull(),
  rounds: integer("rounds").notNull(),
  missingPlayer: integer("missing_player"),
});

export type IndividualMovementSpecInsert =
  typeof individualmovementspec.$inferInsert;
export type IndividualMovementSpecSelect =
  typeof individualmovementspec.$inferSelect;

export const individualmovementtablespec = sqliteTable(
  "individualmovementtablespec",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    movementId: integer("movement_id").references(
      () => individualmovementspec.id,
    ),
    tableNumber: integer("table_number").notNull(),
  },
);

export type IndividualMovementTableSpecInsert =
  typeof individualmovementtablespec.$inferInsert;
export type IndividualMovementTableSpecSelect =
  typeof individualmovementtablespec.$inferSelect;

export const individualmovementroundspec = sqliteTable(
  "individualmovementroundspec",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tableId: integer("table_id").references(
      () => individualmovementtablespec.id,
    ),
    roundNumber: integer("round_number").notNull(),
    n: text("n").notNull(),
    s: text("s").notNull(),
    e: text("e").notNull(),
    w: text("w").notNull(),
    boardStart: integer("board_start").notNull(),
    boardEnd: integer("board_end").notNull(),
  },
);

export type IndividualMovementRoundSpecInsert =
  typeof individualmovementroundspec.$inferInsert;
export type IndividualMovementRoundSpecSelect =
  typeof individualmovementroundspec.$inferSelect;

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

export type PairMovementSpecInsert = typeof pairmovementspec.$inferInsert;
export type PairMovementSpecSelect = typeof pairmovementspec.$inferSelect;

export const pairmovementtablespec = sqliteTable("pairmovementtablespec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  movementId: integer("movement_id").references(() => pairmovementspec.id),
  tableNumber: integer("table_number").notNull(),
});

export type PairMovementTableSpecInsert =
  typeof pairmovementtablespec.$inferInsert;
export type PairMovementTableSpecSelect =
  typeof pairmovementtablespec.$inferSelect;

export const pairmovementroundspec = sqliteTable("pairmovementroundspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id").references(() => pairmovementtablespec.id),
  roundNumber: integer("round_number").notNull(),
  ns: text("ns").notNull(),
  ew: text("ew").notNull(),
  boardStart: integer("board_start").notNull(),
  boardEnd: integer("board_end").notNull(),
});

export type PairMovementRoundSpecInsert =
  typeof pairmovementroundspec.$inferInsert;
export type PairMovementRoundSpecSelect =
  typeof pairmovementroundspec.$inferSelect;

export const teammovementspec = sqliteTable("teammovementspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  tables: integer("tables").notNull(),
  boards: integer("boards").notNull(),
  boardsPerRound: integer("boards_per_round").notNull(),
  rounds: integer("rounds").notNull(),
});

export type TeamMovementSpecInsert = typeof teammovementspec.$inferInsert;
export type TeamMovementSpecSelect = typeof teammovementspec.$inferSelect;

export const teammovementtablespec = sqliteTable("teammovementtablespec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  movementId: integer("movement_id").references(() => teammovementspec.id),
  tableNumber: integer("table_number").notNull(),
});

export type TeamMovementTableSpecInsert =
  typeof teammovementtablespec.$inferInsert;
export type TeamMovementTableSpecSelect =
  typeof teammovementtablespec.$inferSelect;

export const teammovementroundspec = sqliteTable("teammovementroundspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id").references(() => teammovementtablespec.id),
  roundNumber: integer("round_number").notNull(),
  ns: text("ns").notNull(),
  ew: text("ew").notNull(),
  boardStart: integer("board_start").notNull(),
  boardEnd: integer("board_end").notNull(),
});

export type TeamMovementRoundSpecInsert =
  typeof teammovementroundspec.$inferInsert;
export type TeamMovementRoundSpecSelect =
  typeof teammovementroundspec.$inferSelect;
