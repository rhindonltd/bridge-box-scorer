import "server-only";

import { BridgeGame } from "@/db/game-index/schema";
import { Db } from "@/db/games";
import {
  readSeatOccupancies,
  findNonPrimaryOccupantPairs,
} from "@/db/games/queries/seat-occupancy";
import { players } from "@/db/games/tables/players";
import { Club } from "@/db/system/schema";
import {
  scoreEvent,
  scoringNeedsTeams,
  type Standings,
} from "@/modules/scoring";
import {
  buildUsebioData,
  generateUsebioXml,
  type TeamOccupancy,
  type UsebioField,
  type UsebioRosterPair,
} from "@/modules/interchange/usebio";
import { readScoringInputs } from "@/services/leaderboard-service";
import { TournamentLevel } from "@/model/game-types";

/**
 * The USEBIO export adapter. The game is scored exactly as the leaderboard
 * scores it (the same read, rulings and `scoreEvent` run), and the interchange
 * module lays the result out as a USEBIO 1.2 file. This file only reads.
 *
 * Choices the file makes (docs/design/interchange.md):
 * - A pair or team with no result is left out (scored with no baseline lines).
 * - A multi-section game with a combined ranking is written as one SECTION
 *   with the pooled field and section-qualified pair numbers; otherwise one
 *   SECTION per section, ranked within the section.
 */
export async function generateUsebio(
  db: Db,
  game: BridgeGame,
  club: Club,
  tournamentLevel: TournamentLevel,
) {
  const { event, ruled, participants } = await readScoringInputs(db, game);
  const score = scoreEvent(event, ruled, participants, { baseline: false });
  const teamsGame = scoringNeedsTeams(score.classification);

  const [standIns, occupancies] = await Promise.all([
    teamsGame ? Promise.resolve([]) : findNonPrimaryOccupantPairs(db),
    teamsGame ? readTeamOccupancies(db) : Promise.resolve([]),
  ]);

  // Every pair that can appear: the seated pairs, numbered by the id their
  // results carry, and each split handover's stand-in under its own id.
  const pairs: UsebioRosterPair[] = [
    ...participants.pairs.map((p) => ({
      id: p.id,
      seat: p.initialSeat,
      player1: p.player1,
      player2: p.player2,
    })),
    ...standIns.map((p) => ({
      id: p.scoredId,
      seat: p.seat,
      player1: p.player1,
      player2: p.player2,
    })),
  ];

  const sectionName = game.sectionName || "A";
  const fields: UsebioField[] =
    score.sections.length > 1 && score.overall
      ? [fieldOf(score.overall, game.gameId, sectionName, true)]
      : score.sections.map((s) => fieldOf(s, s.section, s.section, false));

  return generateUsebioXml(
    buildUsebioData({
      format: score.classification.format,
      scoringType: game.scoringType,
      club: { name: club.name, clubNumber: club.clubNumber },
      eventName: game.eventName,
      eventDate: game.eventDate,
      sectionName,
      tournamentLevel,
      fields,
      pairs,
      teams: participants.teams,
      occupancies,
      lines: score.lines,
      pairsMatches: score.pairsMatches,
      teamMatches: score.teamMatches,
    }),
  );
}

/** One scored field as written to the file. */
function fieldOf(
  standings: Standings,
  field: string,
  sectionId: string,
  qualified: boolean,
): UsebioField {
  return {
    field,
    sectionId,
    qualified,
    standings: standings.overallScore,
    ...(standings.directional
      ? {
          directional: {
            ns: standings.directional.ns.overallScore,
            ew: standings.directional.ew.overallScore,
          },
        }
      : {}),
  };
}

/**
 * Every seat occupancy as the plain {@link TeamOccupancy} the teams export
 * needs: the occupancy's seat/board-set/arrival flag joined to its two players.
 * The teams layout uses it to declare a team's substitute pair (EBU §2.4.7)
 * and to tag each traveller line with which partnership played it.
 */
async function readTeamOccupancies(db: Db): Promise<TeamOccupancy[]> {
  const [occupancies, playerRows] = await Promise.all([
    readSeatOccupancies(db),
    db.select().from(players),
  ]);
  const playerById = new Map(playerRows.map((p) => [p.id, p]));

  const result: TeamOccupancy[] = [];
  for (const occ of occupancies) {
    const player1 = playerById.get(occ.player1);
    const player2 = playerById.get(occ.player2);
    if (!player1 || !player2) continue;
    result.push({
      id: occ.id,
      seat: occ.seat,
      anchorId: occ.anchorId,
      boards: occ.boards,
      player1,
      player2,
    });
  }
  return result;
}
