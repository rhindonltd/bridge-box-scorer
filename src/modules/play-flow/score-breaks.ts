/**
 * Score breaks in a teams event: the points where a team's two pairs meet back
 * at their home table to score up.
 *
 * The movement dictates them through its matches. A team can score up after a
 * round once every match it has started is finished, so a score break follows
 * round r when r ends one of the team's matches and none of its matches is
 * still part-played across r. A Circulation or Swiss Teams round is a whole
 * match, so every round ends at a break; an American Whist plays a match's two
 * rooms in different rounds, so its only break is after the last round.
 *
 * Pure: no framework or I/O.
 */

import type { ScheduleRound } from "./schedule";

/** The rounds one teams match (or triple comparison) is played over. */
export interface TeamMatchRounds {
  /** The two teams, as their home-NS ids (e.g. "A1NS"); `opponent` null for a bye. */
  home: string;
  opponent: string | null;
  /** The first and last rounds any of the match's boards are played in. */
  firstRound: number;
  lastRound: number;
}

/**
 * The team a teams pair belongs to: its home-NS id. A team's pairs keep their
 * own seats' ids ("A3NS" home, "A3EW" away), so the away pair's team is its id
 * with the direction swapped.
 */
export function teamOfPair(pairId: string): string {
  return pairId.replace(/EW$/, "NS");
}

/** The rounds after which `teamId` has a score break. */
export function scoreBreakRounds(
  matches: TeamMatchRounds[],
  teamId: string,
): Set<number> {
  const own = matches.filter((m) => m.home === teamId || m.opponent === teamId);
  const breaks = new Set<number>();
  for (const { lastRound } of own) {
    const straddled = own.some(
      (m) => m.firstRound <= lastRound && lastRound < m.lastRound,
    );
    if (!straddled) breaks.add(lastRound);
  }
  return breaks;
}

/**
 * The boards the pair played from just after its previous score break up to
 * and including round `roundIndex`: what the team scores up at a break.
 */
export function boardsSinceScoreBreak(
  rounds: ScheduleRound[],
  roundIndex: number,
): number[] {
  let start = roundIndex;
  while (start > 0 && !rounds[start - 1].scoreBreakAfter) start--;
  return rounds.slice(start, roundIndex + 1).flatMap((r) => r.boards);
}
