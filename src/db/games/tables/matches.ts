import {
  sqliteTable,
  text,
  integer,
  index,
} from "drizzle-orm/sqlite-core";

/**
 * A first-class record of ONE committed match in a round, for EVERY movement.
 *
 * A "match" is the structural / seating fact — which participants met over
 * which boards in which round — plus any match-level director ruling. It is the
 * authoritative home for that structure; `boards` holds only per-board RESULTS,
 * and every board carries a `matchId` back to its match. Code reads `matches`
 * for structure/seating and never re-infers it from the board seatings.
 *
 * The table is UNIVERSAL in structure: every materialiser (static pairs, Swiss
 * pairs, teams) writes match rows and every board gets a `matchId`. Whether a
 * match is SCORED AS A UNIT is a property of the format, recorded on
 * `scoredAsUnit`:
 *   - teams / Swiss encounters, triple comparisons and half-matches ARE scored
 *     as a unit (margin → VP, per-round VP, etc.);
 *   - ordinary matchpoint / cross-IMP pairs matches are NOT — the section field
 *     is the scoring unit, and the pairs scorers continue to score board rows
 *     field-wide and ignore the match as a scoring boundary.
 *
 * See `docs/design/matches-table.md` for the full design and invariant.
 */
export const matches = sqliteTable(
  "matches",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    section: text("section").notNull(),
    roundNumber: integer("round_number").notNull(),

    /**
     * What kind of encounter this row represents:
     *   - PAIRS       ordinary pairs seated at one table (any pairs movement)
     *   - TEAMS       teams ordinary two-room encounter
     *   - TRIPLE      one comparison of a three-way (teams)
     *   - HALF_MATCH  a Swiss Pairs "2 half matches" comparison
     *   - BYE         sit-out (one participant, no opponent)
     */
    kind: text("kind", {
      enum: ["PAIRS", "TEAMS", "TRIPLE", "HALF_MATCH", "BYE"],
    }).notNull(),

    /**
     * Whether SCORING treats this match as a unit (teams/Swiss) or whether the
     * section field is the scoring unit (matchpoint/cross-IMP pairs). The pairs
     * scorers ignore the match row entirely when this is false. Stored (rather
     * than derived from `kind` + the game's scoring type) so every read site
     * answers "is this match load-bearing for scoring here?" with a field
     * lookup, not an implicit convention.
     */
    scoredAsUnit: integer("scored_as_unit", { mode: "boolean" }).notNull(),

    /**
     * Participants as the stable home-seat ids `findPairs`/`findTeams` produce
     * (e.g. "A1NS"). `opponent` is null for a BYE. The match row complements the
     * identity layer; it does not duplicate it.
     */
    home: text("home").notNull(),
    opponent: text("opponent"),

    /**
     * Grouping for multi-comparison structures: the half-match group key or the
     * triple group key, so a triple's three comparisons / a half-match's two
     * comparisons are explicit sibling rows rather than inferred.
     */
    groupId: text("group_id"),
    /** Triple slot (1/2) or comparison index within a `groupId`. */
    slot: integer("slot"),

    /**
     * The IMP→VP pool this match scores on when `scoredAsUnit` (20 ordinary,
     * 10 for a triple-SHORT / half-match comparison). Null when not scored as a
     * unit.
     */
    vpPool: integer("vp_pool"),
    /** Inclusive board-number range this match spans. */
    boardStart: integer("board_start").notNull(),
    boardEnd: integer("board_end").notNull(),

    /**
     * The match-level director ruling, replacing the tokens previously smeared
     * across every board row of the match. One of:
     *   VOID:<cause> | VOIDP:<cause> | MM:<side>:<direction>:<fault> | null.
     */
    ruling: text("ruling"),
  },
  (table) => ({
    byRound: index("matches_section_round_idx").on(
      table.section,
      table.roundNumber,
    ),
  }),
);

export type NewMatch = typeof matches.$inferInsert;
export type Match = typeof matches.$inferSelect;

/** What kind of encounter a match row represents. */
export type MatchKind = Match["kind"];
