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

/* movements */

export const individualMovements = sqliteTable(
  "individualmovements",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    n: integer("n"),
    s: integer("s"),
    e: integer("e"),
    w: integer("w"),
    startBoard: integer("start_board"),
    endBoard: integer("end_board"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.tableNumber],
    }),
  }),
);

export type IndividualMovement = typeof individualMovements.$inferSelect;

/* results */
export const results = sqliteTable(
  "results",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    n: integer("n"),
    s: integer("s"),
    e: integer("e"),
    w: integer("w"),
    boardNumber: integer("board_number"),
    contract: text("contract"),
    declarer: text("declarer"),
    tricks: integer("tricks"),
    score: text("score"),
    createdAt: text("created_at"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.roundNumber, table.boardNumber, table.tableNumber],
    }),
  }),
);

export type Result = typeof results.$inferSelect;
