import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

export const metadata = sqliteTable("metadata", {
  id: text("id").primaryKey(),
  movementType: text("movement_type").notNull(),
  boardsPerRound: integer("boards_per_round").notNull(),
  rounds: integer("rounds").notNull(),
  bridgeTables: integer("bridge_tables").notNull(),
});

export type Metadata = typeof metadata.$inferSelect;

/* players */
export const players = sqliteTable(
  "players",
  {
    initialTable: integer("initialTable"),
    initialDirection: text("initialDirection"),
    ebuNumber: integer("ebu_number"),
    firstName: text("first_name"),
    lastName: text("last_name"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.initialTable, table.initialDirection],
    }),
  }),
);

export type Player = typeof players.$inferSelect;

// Note: Pair Movements also contains teams movements as players move as a pair round the room.
export const pairMovements = sqliteTable(
  "movements",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    ns: text("ns"),
    ew: text("ew"),
    startBoard: integer("start_board"),
    endBoard: integer("end_board"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber],
    }),
  }),
);

export type PairMovement = typeof pairMovements.$inferSelect;

/* results */
export const results = sqliteTable(
  "results",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    ns: integer("ns"),
    ew: integer("ew"),
    boardNumber: integer("board_number"),
    contract: text("contract"),
    declarer: text("declarer"),
    tricks: integer("tricks"),
    score: text("score"),
    createdAt: text("created_at"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber, table.boardNumber],
    }),
  }),
);

export type Result = typeof results.$inferSelect;
