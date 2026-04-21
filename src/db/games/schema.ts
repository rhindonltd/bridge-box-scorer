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

/* pairs */
export const pairs = sqliteTable(
  "pairs",
  {
    pairNumber: integer("pair_number"),
    player1: text("player1"),
    player2: text("player2"),
    direction: text("direction"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.pairNumber, table.direction],
    }),
  }),
);

export type Pair = typeof pairs.$inferSelect;

/* results */
export const results = sqliteTable(
  "results",
  {
    roundNumber: integer("round_number"),
    boardNumber: integer("board_number"),
    tableNumber: integer("table_number"),
    nsPair: integer("ns_pair"),
    ewPair: integer("ew_pair"),
    contract: text("contract"),
    declarer: text("declarer"),
    tricks: integer("tricks"),
    score: text("score"),
    createdAt: text("created_at"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [
        table.roundNumber,
        table.boardNumber,
        table.tableNumber,
      ],
    }),
  }),
);

export type Result = typeof results.$inferSelect;

/* movements */

export const individualMovements = sqliteTable(
  "individualmovements",
  {
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    n: text("n"),
    s: text("s"),
    e: text("e"),
    w: text("w"),
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
