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
export const movements = sqliteTable(
  "movements",
  {
    sectionId: text("section_id").references(() => sections.id),
    roundNumber: integer("round_number"),
    tableNumber: integer("table_number"),
    nsPair: integer("ns_pair"),
    ewPair: integer("ew_pair"),
    startBoard: integer("start_board"),
    endBoard: integer("end_board"),
  },
  (table) => ({
    pk: primaryKey({
      columns: [table.sectionId, table.roundNumber, table.tableNumber],
    }),
  }),
);

export type Movement = typeof movements.$inferSelect;
