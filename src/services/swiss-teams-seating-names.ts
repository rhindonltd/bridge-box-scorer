import "server-only";

import { Db } from "@/db/games";
import { findTeams } from "@/db/games/queries/find-teams";
import type { TeamId, TeamsMatch } from "@/model/teams-match-layout";
import type { TeamsTriple } from "@/modules/swiss";
import type { SectionLetter } from "@/model/participants";
import type { NamedTeam, NamedTeamsSeating } from "@/model/swiss-seating";

/**
 * Resolve a drawn Swiss Teams round (stable team ids) into team display names,
 * using the same team derivation the leaderboard and USEBIO export use.
 *
 * A team's stable id is its home NS seat, `${section}${teamId}NS` (e.g.
 * "A1NS") — the id `findTeams` assigns — so a numeric team id maps straight to
 * its seated name. Unknown teams (should not occur) fall back to "Team {id}".
 */
export async function resolveSwissTeamsMatchNames(
  db: Db,
  section: SectionLetter,
  matches: TeamsMatch[],
  byeTeamId: TeamId | null,
  triple: TeamsTriple | null,
): Promise<NamedTeamsSeating> {
  const assigned = await findTeams(db);
  const nameBySeat = new Map(assigned.map((t) => [t.id, t.name]));

  const named = (teamId: TeamId): NamedTeam => ({
    teamId,
    name: nameBySeat.get(`${section}${teamId}NS`) ?? `Team ${teamId}`,
  });

  return {
    matches: matches.map((m) => ({ a: named(m.a), b: named(m.b) })),
    bye: byeTeamId == null ? null : named(byeTeamId),
    triple:
      triple == null
        ? null
        : { a: named(triple.a), b: named(triple.b), c: named(triple.c) },
  };
}
