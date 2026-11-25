import "server-only";

import { getDb, type Db } from "@/db/games";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { computeSectionLeaderboards } from "@/services/leaderboard-service";
import { isSwissRoundComplete } from "@/services/swiss-round-completion";
import { materializeSwissTeamsRound } from "@/services/materialize-swiss-teams-round";
import type { TeamId, TeamsMatch } from "@/model/teams-match-layout";
import {
  drawSwissTeamsRound,
  isStructurallyValidTeamsRound,
  resolveTeamsOddRound,
  swissTeamsField,
  swissTeamsHistory,
  teamOpponentKey,
  type OddHandling,
  type OddRoundResolution,
  type RankedSwissTeam,
  type SerializableTeamsAdvisoryInputs,
  type SwissStandingEntry,
  type SwissTeamsHistory,
  type TeamsTriple,
} from "@/modules/swiss";
import type { NamedTeamsSeating } from "@/model/swiss-seating";
import { resolveSwissTeamsMatchNames } from "@/services/swiss-teams-seating-names";
import { findTeams } from "@/db/games/queries/find-teams";
import type { SectionLetter } from "@/model/participants";

/**
 * Why a Swiss Teams draw could not proceed. Surfaced to the director so the
 * "Draw next round" control can explain the block.
 */
export type DrawSwissTeamsRejection =
  "NOT_SWISS_TEAMS" | "ROUND_INCOMPLETE" | "EVENT_COMPLETE" | "ODD_TEAM_COUNT";

/**
 * A previewed (but NOT committed) Swiss Teams draw: the proposed matches (stable
 * team ids the client echoes back on commit), the odd-field resolution (bye or
 * triple), resolved team names for display, and the repeat advisory. Nothing
 * is written to the DB by a preview.
 */
export type PreviewSwissTeamsResult =
  | {
      ok: true;
      roundNumber: number;
      teams: number;
      matches: TeamsMatch[];
      byeTeamId: TeamId | null;
      triple: TeamsTriple | null;
      named: NamedTeamsSeating;
      /**
       * Current standings (best first) with each team's running VP total — the
       * order the draw ranked the field on. Shown on the preview so the
       * director can see the draw pairs close-ranked teams.
       */
      standings: SwissStandingEntry[];
      /**
       * Unordered team-pair keys (see teamOpponentKey) of the drawn matches that
       * repeat an earlier-round opponent, so the preview can highlight exactly
       * which match to check.
       */
      repeatMatchKeys: string[];
      /**
       * The advisory-relevant history (team count + played opponents), so the
       * director's device can re-run the repeat check locally after each edit —
       * no round-trip, identical logic to this server-side draw.
       */
      advisoryInputs: SerializableTeamsAdvisoryInputs;
      hadUnavoidableRepeat: boolean;
    }
  | { ok: false; reason: DrawSwissTeamsRejection };

/** Outcome of committing a Swiss Teams round. */
export type CommitSwissTeamsResult =
  | { ok: true; roundNumber: number }
  | { ok: false; reason: DrawSwissTeamsRejection | "INVALID_MATCHES" };

/** A triple recovered from the match rows, for the draw's slot-2 continuation. */
/**
 * Read a section's `matches` rows and fold them into the Swiss Teams history
 * the draw needs (`swissTeamsHistory`).
 */
async function getSwissTeamsHistory(
  db: Db,
  section: SectionLetter,
): Promise<SwissTeamsHistory> {
  const { matches } = await import("@/db/games/tables/matches");
  const { eq } = await import("drizzle-orm");

  return swissTeamsHistory(
    await db.select().from(matches).where(eq(matches.section, section)),
  );
}

/**
 * Whether a round is safe to draw from: every playable board has a final result
 * (CONFIRMED, OVERRIDDEN, or CANCELLED). A bye's SIT_OUT boards are never
 * played, so they count as complete (they don't block the next draw). An empty
 * round is not "complete".
 */
function isRoundComplete(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
): Promise<boolean> {
  // Teams: a bye's SIT_OUT boards are never played, so they count as resolved
  // (they don't block the next draw) rather than being filtered out. Teams has
  // no HALF_AVERAGE compensation blocks.
  return isSwissRoundComplete(db, section, roundNumber, {
    completeStatuses: [
      "CONFIRMED",
      "OVERRIDDEN",
      "CANCELLED",
      "REMOVED_TEAMS",
      "SIT_OUT",
    ],
  });
}

/**
 * The field in draw order (best team first), from the section standings
 * (`swissTeamsField`).
 */
async function rankedStandings(
  db: Db,
  gameId: string,
  section: SectionLetter,
  teams: number,
): Promise<{ order: TeamId[]; ranked: RankedSwissTeam[] }> {
  const sections = await computeSectionLeaderboards(db, gameId);
  return swissTeamsField(
    sections.find((s) => s.section === section),
    teams,
  );
}

/** Everything needed to draw or validate the next teams round after checks pass. */
interface TeamsDrawContext {
  db: Db;
  teams: number;
  boardsPerRound: number;
  /** The event's declared round count (for placing a short triple's set C). */
  totalRounds: number;
  oddHandling: OddHandling;
  nextRound: number;
  /**
   * How the next round's odd team is resolved, from the per-round plan: "BYE",
   * "SHORT", or a `{ kind: "LONG"; group }` slot. An even field ignores it.
   */
  oddRound: OddRoundResolution;
  /**
   * The pre-determined triple for the next round when it is the SECOND slot of
   * a long triple (its teams fixed by the first slot, advanced to slot 2), or
   * null otherwise. When set, the draw reuses this triple rather than choosing
   * a fresh one, and does NOT draw a fresh three-way.
   */
  fixedTriple: TeamsTriple | null;
  standings: TeamId[];
  playedOpponents: ReadonlySet<string>;
  hadBye: ReadonlySet<TeamId>;
  hadTriple: ReadonlySet<TeamId>;
  /** Current standings (best first) with running totals, for the preview. */
  ranked: RankedSwissTeam[];
}

/**
 * Resolve and validate the preconditions for drawing the next Swiss Teams round
 * and assemble the pure-engine inputs. Returns a rejection reason when the
 * section isn't Swiss Teams, an odd field can't be resolved, the event is
 * complete, or the current round isn't fully scored — so both preview and
 * commit reject cleanly and identically.
 */
async function resolveTeamsDrawContext(
  gameId: string,
  section: SectionLetter,
): Promise<TeamsDrawContext | { reason: DrawSwissTeamsRejection }> {
  const db = await getDb(gameId);
  if (!db) {
    throw new Error("Game db does not exist");
  }

  const selected = await getSectionMovement(db, section);
  if (!selected || selected.source !== "SWISS_TEAMS") {
    return { reason: "NOT_SWISS_TEAMS" };
  }

  const {
    teams,
    rounds: totalRounds,
    boardsPerRound,
    oddHandling = "BYE",
    oddRoundPlan,
  } = selected.swissTeams;

  // An odd field is resolved by a bye or a triple (both supported); a
  // triple needs at least three teams to form the three-way.
  if (teams % 2 !== 0 && oddHandling === "TRIPLE" && teams < 3) {
    return { reason: "ODD_TEAM_COUNT" };
  }

  const { highestRound, playedOpponents, hadBye, hadTriple, triples } =
    await getSwissTeamsHistory(db, section);
  const currentRound = highestRound;

  if (currentRound >= totalRounds) {
    return { reason: "EVENT_COMPLETE" };
  }

  if (
    currentRound >= 1 &&
    !(await isRoundComplete(db, section, currentRound))
  ) {
    return { reason: "ROUND_INCOMPLETE" };
  }

  const { order, ranked } = await rankedStandings(db, gameId, section, teams);

  const nextRound = currentRound + 1;
  const { oddRound, fixedTriple } = resolveTeamsOddRound(
    oddHandling,
    oddRoundPlan,
    nextRound,
    triples,
  );

  return {
    db,
    teams,
    boardsPerRound,
    totalRounds,
    oddHandling,
    nextRound,
    oddRound,
    fixedTriple,
    standings: order,
    playedOpponents,
    hadBye,
    hadTriple,
    ranked,
  };
}

/**
 * Compute (but do NOT commit) the next Swiss Teams round for a section.
 *
 * Runs the same preconditions as the commit, draws from current standings +
 * history (avoiding repeat opponents; byeing or triangling the bottom of the
 * field for an odd count), and resolves team names so the director can review
 * the proposed matches before accepting. Nothing is written and nothing is
 * broadcast. Since the current round is fully scored (a precondition),
 * standings are stable, so the preview matches what a subsequent commit of the
 * same draw would produce.
 */
export async function previewNextSwissTeamsRound(
  gameId: string,
  section: SectionLetter,
): Promise<PreviewSwissTeamsResult> {
  const ctx = await resolveTeamsDrawContext(gameId, section);
  if ("reason" in ctx) {
    return { ok: false, reason: ctx.reason };
  }

  const draw = drawSwissTeamsRound({
    teams: ctx.teams,
    standings: ctx.standings,
    playedOpponents: ctx.playedOpponents,
    oddRound: ctx.oddRound,
    hadBye: ctx.hadBye,
    hadTriple: ctx.hadTriple,
    // A long triple's second slot reuses its first slot's three teams rather
    // than drawing a fresh three-way.
    fixedTriple: ctx.fixedTriple ?? undefined,
  });

  const named = await resolveSwissTeamsMatchNames(
    ctx.db,
    section,
    draw.matches,
    draw.byeTeamId,
    draw.triple,
  );
  const standings = await buildTeamStandings(ctx.db, section, ctx.ranked);

  // Which drawn matches repeat an earlier-round opponent (for the UI to flag).
  const repeatMatchKeys = draw.matches
    .map((m) => teamOpponentKey(m.a, m.b))
    .filter((key) => ctx.playedOpponents.has(key));

  return {
    ok: true,
    roundNumber: ctx.nextRound,
    teams: ctx.teams,
    matches: draw.matches,
    byeTeamId: draw.byeTeamId,
    triple: draw.triple,
    named,
    standings,
    repeatMatchKeys,
    advisoryInputs: {
      teams: ctx.teams,
      playedOpponents: [...ctx.playedOpponents],
    },
    hadUnavoidableRepeat: draw.hadUnavoidableRepeat,
  };
}

/**
 * Resolve the ranked team standings into display entries with team names, in
 * the order the draw ranked the field. Names come from the same team
 * derivation the match resolver uses (`findTeams`, keyed by home NS seat), so a
 * team's label matches its match-card label.
 */
async function buildTeamStandings(
  db: Db,
  section: SectionLetter,
  ranked: RankedSwissTeam[],
): Promise<SwissStandingEntry[]> {
  const assigned = await findTeams(db);
  const nameBySeat = new Map(assigned.map((t) => [t.id, t.name]));

  return ranked.map((r) => ({
    id: r.id,
    name: nameBySeat.get(`${section}${r.id}NS`) ?? `Team ${r.id}`,
    total: r.total,
    rank: r.rank,
    tied: r.tied,
  }));
}

/**
 * Commit the next Swiss Teams round with the EXACT matches the director
 * accepted. Re-checks the same preconditions (so a stale commit can't slip a
 * round in after the event moved on), then validates that the round is
 * structurally sound (every team placed exactly once). Materializes that round
 * — the open/closed-room board rows plus any bye sit-out or triple — and
 * reports the round number. It does NOT advance the timer; the caller
 * broadcasts the live updates.
 *
 * The director may have edited the previewed draw (swapping teams' places), so
 * the committed matches are taken as an argument and persisted verbatim rather
 * than re-drawn — the exact arrangement the director accepted is what runs.
 */
export async function commitNextSwissTeamsRound(
  gameId: string,
  section: SectionLetter,
  matches: TeamsMatch[],
  byeTeamId: TeamId | null,
  triple: TeamsTriple | null,
): Promise<CommitSwissTeamsResult> {
  const ctx = await resolveTeamsDrawContext(gameId, section);
  if ("reason" in ctx) {
    return { ok: false, reason: ctx.reason };
  }

  if (!isStructurallyValidTeamsRound(ctx.teams, matches, byeTeamId, triple)) {
    return { ok: false, reason: "INVALID_MATCHES" };
  }

  await materializeSwissTeamsRound(
    gameId,
    section,
    ctx.nextRound,
    ctx.boardsPerRound,
    ctx.totalRounds,
    matches,
    byeTeamId,
    triple,
  );

  return { ok: true, roundNumber: ctx.nextRound };
}
