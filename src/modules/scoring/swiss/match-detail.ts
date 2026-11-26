import type { TeamMatch, TeamMatchRow } from "./team-match";

/**
 * One teams match (or triple comparison) as a teams scorer credited it, with
 * the board rows of both rooms. `scoreEvent` turns it into the kernel
 * `TeamMatchResult` (tagging the field and describing each room). The scorers
 * record these from the same values they credit to the standings, so the two
 * cannot disagree.
 */
export interface TeamMatchDetail<R extends TeamMatchRow> {
  section: string;
  round: number;
  triple: "SHORT" | "LONG" | null;
  home: string;
  opponent: string;
  boards: {
    boardNumber: number;
    /** Net IMPs or the board result 1 / 0.5 / 0, from the home side. */
    home: number | null;
    homeRow: R | undefined;
    awayRow: R | undefined;
  }[];
  homeScore: number;
  opponentScore: number;
  boardsPlayed: number;
  void: boolean;
}

/** The per-board entries of a match detail, from per-board home values. */
export function detailBoards<R extends TeamMatchRow>(
  match: TeamMatch<R>,
  perBoard: { boardNumber: number; value: number | null }[],
): TeamMatchDetail<R>["boards"] {
  return perBoard.map(({ boardNumber, value }) => ({
    boardNumber,
    home: value,
    homeRow: match.homeRowsByBoard.get(boardNumber),
    awayRow: match.opponentRowsByBoard.get(boardNumber),
  }));
}
