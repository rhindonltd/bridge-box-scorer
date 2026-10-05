import "server-only";

import { Db } from "@/db/games";
import { findTeams } from "@/db/games/queries/find-teams";
import type {
  TeamId,
  TeamsMatch,
  TeamsTriple,
} from "@/movement/swiss-teams/swiss-teams-pairing";
import type { SectionLetter } from "@/model/participants";

/** A team identified by its stable id and resolved display name. */
export interface NamedTeam {
  teamId: TeamId;
  name: string;
}

/** One drawn match with both teams' names. */
export interface NamedTeamsMatch {
  a: NamedTeam;
  b: NamedTeam;
}

/** A three-way triple with all three teams' names. */
export interface NamedTeamsTriple {
  a: NamedTeam;
  b: NamedTeam;
  c: NamedTeam;
}

/** A round's team draw with names: the matches plus any bye or triple. */
export interface NamedTeamsSeating {
  matches: NamedTeamsMatch[];
  bye: NamedTeam | null;
  triple: NamedTeamsTriple | null;
}

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
