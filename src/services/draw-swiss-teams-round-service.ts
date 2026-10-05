import "server-only";

import { getDb, type Db } from "@/db/games";
import { getSectionMovement } from "@/db/games/queries/get-section-movement";
import { computeSectionLeaderboards } from "@/services/leaderboard-service";
import { materializeSwissTeamsRound } from "@/services/materialize-swiss-teams-round";
import {
  continueLongTriple,
  drawSwissTeamsRound,
  roundOddResolution,
  teamIds,
  teamOpponentKey,
  type OddHandling,
  type OddRoundResolution,
  type SerializableTeamsAdvisoryInputs,
  type TeamId,
  type TeamsMatch,
  type TeamsTriple,
} from "@/movement/swiss-teams/swiss-teams-pairing";
import {
  detectTriples,
  type DetectedTriple,
  type TeamMatchRow,
} from "@/scoring/swiss/team-match";
import type { SwissTeamsOddRound } from "@/model/selected-movement";
import {
  resolveSwissTeamsMatchNames,
  type NamedTeamsSeating,
} from "@/services/swiss-teams-seating-names";
import { findTeams } from "@/db/games/queries/find-teams";
import type { SwissStandingEntry } from "@/movement/swiss/swiss-standings";
import { SectionLetter, parseSeat } from "@/model/participants";

/**
 * Why a Swiss Teams draw could not proceed. Surfaced to the director so the
 * "Draw next round" control can explain the block.
 */
export type DrawSwissTeamsRejection =
  | "NOT_SWISS_TEAMS"
  | "ROUND_INCOMPLETE"
  | "EVENT_COMPLETE"
  | "ODD_TEAM_COUNT";

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

/** The current-round number and the matches already played, from board rows. */
interface SwissTeamsHistory {
  highestRound: number;
  playedOpponents: Set<string>;
  /** Teams that have already had a bye (recovered from SIT_OUT rows). */
  hadBye: Set<TeamId>;
  /** Teams that have already been in a triple (recovered from the triples). */
  hadTriple: Set<TeamId>;
  /** Every triple played so far (short + long), as detected from the rows. */
  triples: DetectedTriple[];
}

/**
 * Reduce a section's board rows to the Swiss Teams history the draw needs: the
 * highest round materialized so far, the set of team matchups already played,
 * the teams that have already had a bye, and every triple played so far (with
 * the teams in each, so a long triple's second slot can reuse its first slot's
 * teams).
 *
 * A played match is recovered from each home table's row — the NS seat is the
 * home team and the EW seat encodes the opponent's home table. A bye is a
 * SIT_OUT row (NS = the bye team, EW = a phantom), recorded as a bye not a
 * match. Triples are recovered with the SAME detector the scorer uses
 * ({@link detectTriples}): a SHORT triple is a home table facing two opponents
 * in one round; a LONG triple is two consecutive 3-cycle rounds for one trio.
 * Each triple's three teams are recorded in `hadTriple`, and all three of its
 * pairwise matchups in `playedOpponents`.
 */
async function getSwissTeamsHistory(
  db: Db,
  section: SectionLetter,
): Promise<SwissTeamsHistory> {
  const { boards } = await import("@/db/games/tables/boards");
  const { eq } = await import("drizzle-orm");

  const rows = await db
    .select({
      roundNumber: boards.roundNumber,
      ns: boards.ns,
      ew: boards.ew,
      status: boards.status,
    })
    .from(boards)
    .where(eq(boards.section, section));

  const playedOpponents = new Set<string>();
  const hadBye = new Set<TeamId>();
  let highestRound = 0;

  // Minimal TeamMatchRow-shaped rows for the shared triple detector (it reads
  // only section / roundNumber / ns / ew / status).
  const detectorRows: TeamMatchRow[] = [];

  for (const row of rows) {
    highestRound = Math.max(highestRound, row.roundNumber);

    // A SIT_OUT row is a bye: record the sitting team, not a played match.
    if (row.status === "SIT_OUT") {
      try {
        hadBye.add(parseSeat(row.ns).tableNumber);
      } catch {
        // A non-seat NS id (should not occur) is skipped.
      }
      continue;
    }

    try {
      const home = parseSeat(row.ns);
      const away = parseSeat(row.ew);
      playedOpponents.add(teamOpponentKey(home.tableNumber, away.tableNumber));
    } catch {
      // A non-seat id (should not occur for teams) is skipped.
    }

    detectorRows.push({
      section,
      roundNumber: row.roundNumber,
      boardNumber: 0,
      ns: row.ns,
      ew: row.ew,
      confirmedResult: null,
      directorOverrideResult: null,
      status: row.status,
    });
  }

  const triples = detectTriples(detectorRows);
  const hadTriple = new Set<TeamId>();
  for (const t of triples) for (const team of t.teams) hadTriple.add(team);

  return { highestRound, playedOpponents, hadBye, hadTriple, triples };
}

/**
 * Whether a round is safe to draw from: every playable board has a final result
 * (CONFIRMED or OVERRIDDEN). A bye's SIT_OUT boards are never played, so they
 * count as complete (they don't block the next draw). An empty round is not
 * "complete".
 */
async function isRoundComplete(
  db: Db,
  section: SectionLetter,
  roundNumber: number,
): Promise<boolean> {
  const { boards } = await import("@/db/games/tables/boards");
  const { and, eq } = await import("drizzle-orm");

  const rows = await db
    .select({ status: boards.status })
    .from(boards)
    .where(
      and(eq(boards.section, section), eq(boards.roundNumber, roundNumber)),
    );

  if (rows.length === 0) return false;
  return rows.every(
    (r) =>
      r.status === "CONFIRMED" ||
      r.status === "OVERRIDDEN" ||
      r.status === "SIT_OUT",
  );
}

/**
 * Build the ranked team standings (best team first) as stable team ids from the
 * section leaderboard. The team overall lines are keyed by the team's home NS
 * seat (e.g. "A1NS"), already ranked; map each back to its home table number.
 * Any team not yet ranked is appended in id order so the field is complete.
 */
/** A ranked standings line for a team, before names are resolved. */
interface RankedTeam {
  id: TeamId;
  total: number;
  rank: number;
  tied: boolean;
}

async function rankedStandings(
  db: Db,
  gameId: string,
  section: SectionLetter,
  teams: number,
): Promise<{ order: TeamId[]; ranked: RankedTeam[] }> {
  const sections = await computeSectionLeaderboards(db, gameId);
  const sectionBoard = sections.find((s) => s.section === section);

  const order: TeamId[] = [];
  const ranked: RankedTeam[] = [];
  const seen = new Set<TeamId>();

  if (sectionBoard) {
    // Lines are already ranked best-first and (for Swiss Teams VP) carry the
    // running VP total the field is ranked on plus its rank/tie flags.
    for (const line of sectionBoard.overallScore.lines as {
      teamId: string;
      totalVP?: number;
      rank: number;
      tied: boolean;
    }[]) {
      try {
        const id = parseSeat(line.teamId).tableNumber;
        if (!seen.has(id)) {
          order.push(id);
          ranked.push({
            id,
            total: line.totalVP ?? 0,
            rank: line.rank,
            tied: line.tied,
          });
          seen.add(id);
        }
      } catch {
        // Skip a non-seat team id (should not occur).
      }
    }
  }

  // Append any team not yet ranked, lowest priority, with a zero total.
  const lastRank = ranked.length > 0 ? ranked[ranked.length - 1].rank : 0;
  for (const id of teamIds(teams)) {
    if (!seen.has(id)) {
      order.push(id);
      ranked.push({ id, total: 0, rank: lastRank + 1, tied: false });
      seen.add(id);
    }
  }

  return { order, ranked };
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
  ranked: RankedTeam[];
}

/**
 * Resolve the next round's odd-team handling and, when it is the second slot of
 * a long triple, the fixed triple to reuse.
 *
 * A long triple occupies two adjacent plan entries sharing a `group`. If the
 * next round's entry is `{ kind: "LONG"; group g }` AND the PREVIOUS round's
 * entry is the same group, the next round is that triple's SECOND slot: its
 * three teams are fixed by the first slot (recovered from the detected
 * triples), advanced to slot 2 via {@link continueLongTriple}. No fresh triple
 * is drawn. In every other case (bye, short, or a long triple's first slot)
 * there is no fixed triple.
 */
function resolveOddRound(
  oddHandling: OddHandling,
  oddRoundPlan: SwissTeamsOddRound[] | undefined,
  nextRound: number,
  triples: DetectedTriple[],
): { oddRound: OddRoundResolution; fixedTriple: TeamsTriple | null } {
  const plan = oddRoundPlan as OddRoundResolution[] | undefined;
  const oddRound = roundOddResolution(oddHandling, plan, nextRound);

  if (typeof oddRound !== "object" || oddRound.kind !== "LONG") {
    return { oddRound, fixedTriple: null };
  }

  const prev = plan?.[nextRound - 2];
  const isSecondSlot =
    typeof prev === "object" && prev.kind === "LONG" && prev.group === oddRound.group;
  if (!isSecondSlot) {
    return { oddRound, fixedTriple: null };
  }

  // The first slot was the previous round; find that long triple's teams.
  const firstRound = nextRound - 1;
  const firstSlot = triples.find(
    (t) => t.kind === "LONG" && t.rounds.includes(firstRound),
  );
  if (!firstSlot) {
    // The first slot isn't recoverable yet (shouldn't happen once it is
    // materialized); fall back to drawing a fresh long triple.
    return { oddRound, fixedTriple: null };
  }

  const [a, b, c] = firstSlot.teams;
  const fixedTriple = continueLongTriple({
    a,
    b,
    c,
    kind: "LONG",
    group: oddRound.group,
    slot: 1,
  });
  return { oddRound, fixedTriple };
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

  if (currentRound >= 1 && !(await isRoundComplete(db, section, currentRound))) {
    return { reason: "ROUND_INCOMPLETE" };
  }

  const { order, ranked } = await rankedStandings(db, gameId, section, teams);

  const nextRound = currentRound + 1;
  const { oddRound, fixedTriple } = resolveOddRound(
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
  ranked: RankedTeam[],
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
 * Whether a set of team matches (+ bye/triple) is a structurally valid round
 * for a field of `teams` teams: every team appears exactly once across the
 * matches, the bye, and the triple, and each is a real team id. Advisory
 * issues (a repeat pairing) are NOT checked here — those are the director's
 * call and don't block a commit.
 */
function isStructurallyValidTeamsRound(
  teams: number,
  matches: TeamsMatch[],
  byeTeamId: TeamId | null,
  triple: TeamsTriple | null,
): boolean {
  const seen: TeamId[] = [];
  for (const m of matches) seen.push(m.a, m.b);
  if (byeTeamId != null) seen.push(byeTeamId);
  if (triple != null) seen.push(triple.a, triple.b, triple.c);

  const expected = teamIds(teams);
  if (seen.length !== expected.length) return false;
  if (new Set(seen).size !== seen.length) return false;
  return seen.every((id) => id >= 1 && id <= teams);
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
