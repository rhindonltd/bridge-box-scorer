import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

/* loginsessions */
export const loginSessions = sqliteTable("loginsessions", {
  token: text("token").primaryKey(),
  director: integer("director", { mode: "boolean" }).notNull(),
});

export type LoginSession = typeof loginSessions.$inferSelect;

/* settings */
export const settings = sqliteTable("settings", {
  settingKey: text("setting_key").primaryKey(),
  settingValue: text("setting_value").notNull(),
});

export type Setting = typeof settings.$inferSelect;

/* events */
export const events = sqliteTable("events", {
  id: text("id").primaryKey(),
  eventName: text("event_name").notNull(),
  eventDate: text("event_date").notNull(), // SQLite DATETIME stored as text
  director: text("director").notNull(),
  eventType: text("event_type").notNull(),
  createdAt: text("created_at").notNull(),
});

export type BridgeEvent = typeof events.$inferSelect;

/* sessions */
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  eventId: text("event_id")
    .references(() => events.id)
    .notNull(),
  sessionName: text("session_name").notNull(),
});

export type BridgeSession = typeof sessions.$inferSelect;

/* sections */
export const sections = sqliteTable("sections", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id),
  sectionName: text("section_name").notNull(),
  started: integer("started", { mode: "boolean" }),
  finished: integer("started", { mode: "boolean" }),
});

export type BridgeSection = typeof sections.$inferSelect;

export const sectionmovements = sqliteTable("sectionmovements", {
  id: text("id")
    .primaryKey()
    .references(() => sections.id),
  movementType: text("movement_type").notNull(),
  boardsPerRound: integer("boards_per_round").notNull(),
  rounds: integer("rounds").notNull(),
  bridgeTables: integer("bridge_tables").notNull(),
});

export type SectionMovement = typeof sectionmovements.$inferSelect;

/* pairs */
export const pairs = sqliteTable(
  "pairs",
  {
    sectionId: text("section_id").references(() => sections.id),
    pairNumber: integer("pair_number"),
    player1: text("player1"),
    player2: text("player2"),
    direction: text("direction"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.sectionId, table.pairNumber, table.direction],
    }),
  }),
);

export type Pair = typeof pairs.$inferSelect;

/* results */
export const results = sqliteTable(
  "results",
  {
    sectionId: text("section_id").references(() => sections.id),
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
        table.sectionId,
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
        sectionId: text("section_id").references(() => sections.id),
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
            columns: [table.sectionId, table.roundNumber, table.tableNumber],
        }),
    }),
);

export type IndividualMovement = typeof individualMovements.$inferSelect;

// Note: Pair Movements also contains teams movements as players move as a pair round the room.
export const pairMovements = sqliteTable(
  "movements",
  {
    sectionId: text("section_id").references(() => sections.id),
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    ns: text("ns"),
    ew: text("ew"),
    startBoard: integer("start_board"),
    endBoard: integer("end_board"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.sectionId, table.roundNumber, table.tableNumber],
    }),
  }),
);

export type PairMovement = typeof pairMovements.$inferSelect;

/* movement specs */

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

export type IndividualMovementSpecInsert = typeof individualmovementspec.$inferInsert;
export type IndividualMovementSpecSelect = typeof individualmovementspec.$inferSelect;

export const individualmovementtablespec = sqliteTable("individualmovementtablespec", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    movementId: integer("movement_id").references(() => individualmovementspec.id),
    tableNumber: integer("table_number").notNull(),
});

export type IndividualMovementTableSpecInsert = typeof individualmovementtablespec.$inferInsert;
export type IndividualMovementTableSpecSelect = typeof individualmovementtablespec.$inferSelect;

export const individualmovementroundspec = sqliteTable("individualmovementroundspec", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tableId: integer("table_id").references(() => individualmovementtablespec.id),
    roundNumber: integer("round_number").notNull(),
    n: text("n").notNull(),
    s: text("s").notNull(),
    e: text("e").notNull(),
    w: text("w").notNull(),
    boardStart: integer("board_start").notNull(),
    boardEnd: integer("board_end").notNull(),
});

export type IndividualMovementRoundSpecInsert = typeof individualmovementroundspec.$inferInsert;
export type IndividualMovementRoundSpecSelect = typeof individualmovementroundspec.$inferSelect;

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

export type PairMovementTableSpecInsert = typeof pairmovementtablespec.$inferInsert;
export type PairMovementTableSpecSelect = typeof pairmovementtablespec.$inferSelect;

export const pairmovementroundspec = sqliteTable("pairmovementroundspec", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tableId: integer("table_id").references(() => pairmovementtablespec.id),
  roundNumber: integer("round_number").notNull(),
  ns: text("ns").notNull(),
  ew: text("ew").notNull(),
  boardStart: integer("board_start").notNull(),
  boardEnd: integer("board_end").notNull(),
});

export type PairMovementRoundSpecInsert = typeof pairmovementroundspec.$inferInsert;
export type PairMovementRoundSpecSelect = typeof pairmovementroundspec.$inferSelect;

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

export type TeamMovementTableSpecInsert = typeof teammovementtablespec.$inferInsert;
export type TeamMovementTableSpecSelect = typeof teammovementtablespec.$inferSelect;

export const teammovementroundspec = sqliteTable("teammovementroundspec", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tableId: integer("table_id").references(() => teammovementtablespec.id),
    roundNumber: integer("round_number").notNull(),
    ns: text("ns").notNull(),
    ew: text("ew").notNull(),
    boardStart: integer("board_start").notNull(),
    boardEnd: integer("board_end").notNull(),
});

export type TeamMovementRoundSpecInsert = typeof teammovementroundspec.$inferInsert;
export type TeamMovementRoundSpecSelect = typeof teammovementroundspec.$inferSelect;
