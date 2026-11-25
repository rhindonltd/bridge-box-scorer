/**
 * The enumerated values stored on a game and its rows. They live in the shared
 * kernel so that pure code (rulings, scoring, swiss, the movement catalog) can
 * use them without importing the database layer; the Drizzle schemas import
 * the value lists from here for their column enums.
 */

/** Pairs or teams family. */
export const GameTypes = ["PAIRS", "TEAMS"] as const;
export type GameType = (typeof GameTypes)[number];

/**
 * A game's structural format, orthogonal to its {@link GameType}. Together
 * they give the four event types a director picks from:
 *
 *   gameType × gameFormat
 *   ---------------------
 *   PAIRS × STANDARD  → Pairs
 *   PAIRS × SWISS     → Swiss Pairs
 *   TEAMS × STANDARD  → Teams
 *   TEAMS × SWISS     → Swiss Teams
 *
 * - STANDARD: a fixed, fully-known movement chosen from the recommendations.
 * - SWISS: drawn round by round from the current standings.
 *
 * Stored in the game's `event_format` column.
 */
export const GameFormats = ["STANDARD", "SWISS"] as const;
export type GameFormat = (typeof GameFormats)[number];

/** How a game is scored. Pairs use MP / XIMP; teams use IMP / IMP_VP / BAM / PAB. */
export const ScoringTypes = [
  "MP",
  "IMP",
  "IMP_VP",
  "XIMP",
  "BAM",
  "PAB",
] as const;
export type ScoringType = (typeof ScoringTypes)[number];

/** The EBU tournament level a game is reported at. */
export const TournamentLevels = [
  "NORMAL_CLUB",
  "NO_POINTS_CLUB",
  "POINTS_ONLY_CLUB",
  "DISTRICT_LEAGUE",
  "COUNTY_BLACK",
  "COUNTY_BLUE",
  "MAJOR_COUNTY",
  "NATIONAL_HEAT",
] as const;
export type TournamentLevel = (typeof TournamentLevels)[number];

/**
 * The lifecycle of one board played at one table in one round (the `boards`
 * table's `status`).
 */
export const BoardStatuses = [
  "NOT_PLAYED",
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "OVERRIDDEN",
  "CANCELLED",
  "REMOVED_TEAMS",
  "SIT_OUT",
  "HALF_AVERAGE",
  "ABSENT",
] as const;
export type BoardStatus = (typeof BoardStatuses)[number];

/**
 * What kind of encounter a match row represents (the `matches` table's
 * `kind`):
 *   - PAIRS       an ordinary pairs head-to-head at one table
 *   - TEAMS       a teams two-room encounter
 *   - TRIPLE      one comparison of a three-way (teams)
 *   - HALF_MATCH  a Swiss Pairs "2 half matches" comparison
 *   - BYE         a sit-out (one participant, no opponent)
 */
export const MatchKinds = [
  "PAIRS",
  "TEAMS",
  "TRIPLE",
  "HALF_MATCH",
  "BYE",
] as const;
export type MatchKind = (typeof MatchKinds)[number];
