import { sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Optional per-team display name for a Teams event (currently Swiss Teams).
 *
 * A team is the two pairs seated at one home table; it is otherwise derived
 * from the seating rather than stored (see `findTeams`). The only piece of
 * team state a user enters directly is the team name, which the North-South
 * pair may optionally provide when they seat. This table holds that name.
 *
 * The primary key `teamId` is the team's home-table id — its section + table
 * number with the NS/EW direction dropped (e.g. "A1"), produced by
 * `deriveTeamId`. It is deliberately NOT the NS pair seat ("A1NS"): a team is
 * both of its pairs, so the id names the table, not one pair.
 *
 * `teamName` is nullable. When absent (or never entered), the team name falls
 * back at read time to the North player's surname, so a later change of the
 * North player is reflected without rewriting this row.
 */
export const teams = sqliteTable("teams", {
  teamId: text("team_id").primaryKey(),
  teamName: text("team_name"),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
