import "server-only";

import { eq, or } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { assignments as pairAssignments } from "@/db/games/tables/assignments";
import type { Player } from "@/db/games/tables/players";
import { PairSeat } from "@/model/participants";
import {
  buildAssignmentPlayerLookup,
  type PairPlayers,
} from "@/db/games/queries/assignment-players";

/** A board row as this pair sees it, grouped under its round. */
type PairBoardRow = {
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  status: string | null;
  ns: string;
  ew: string;
};

/**
 * Build a player schedule for a single seat: which boards this pair plays in
 * which round, at which table, against whom, plus sit-out rounds padded in.
 *
 * The steps are deliberately kept as separate helpers (assignment lookup →
 * this pair's boards → the game-wide player lookup → round assembly →
 * total-round padding). The DB reads run in a fixed order.
 */
export async function getSchedule(db: Db, seat: string) {
  const assignment = await findAssignment(db, seat);
  if (!assignment) {
    return null;
  }

  const assignmentId = assignment.id;
  // The pair's side for submission is based on the initialSeat suffix.
  const side: "NS" | "EW" = seat.endsWith("NS") ? "NS" : "EW";

  const pairBoards = (await findPairBoards(db, assignmentId)) as PairBoardRow[];

  // Game-wide lookup from an assignment id to the two players sitting there.
  const assignmentToPlayers = await buildAssignmentPlayerLookup(db);

  const rounds = assembleRounds(pairBoards, assignmentToPlayers, assignmentId);

  const totalRounds = await countTotalRounds(db);

  return { assignmentId, side, rounds: padSitOutRounds(rounds, totalRounds) };
}

// --- DB reads (kept in a fixed call order the tests rely on) -------------

/** Look up this seat's assignment row (null when the seat has none yet). */
function findAssignment(db: Db, seat: string) {
  return db
    .select()
    .from(pairAssignments)
    .where(eq(pairAssignments.initialSeat, seat as PairSeat))
    .get();
}

/** All board rows in which this pair appears as NS or EW. */
function findPairBoards(db: Db, assignmentId: string) {
  return db
    .select()
    .from(pairsBoards)
    .where(
      or(eq(pairsBoards.ns, assignmentId), eq(pairsBoards.ew, assignmentId)),
    );
}

/** Total rounds in the game, from ALL boards (not just this pair's). */
async function countTotalRounds(db: Db): Promise<number> {
  const allGameBoards = await db
    .select({ roundNumber: pairsBoards.roundNumber })
    .from(pairsBoards);
  const allRoundNumbers = new Set(allGameBoards.map((b) => b.roundNumber));
  return allRoundNumbers.size > 0 ? Math.max(...allRoundNumbers) : 0;
}

// --- Pure assembly -------------------------------------------------------

type ActiveRound = {
  roundNumber: number;
  tableNumber: number;
  /** Which side this pair sits for the round (they can switch in some movements). */
  side: "NS" | "EW";
  boards: number[];
  boardStatuses: { boardNumber: number; status: string | null }[];
  sitOut: boolean;
  players: {
    N: Player | null;
    S: Player | null;
    E: Player | null;
    W: Player | null;
  };
};

type ScheduleRound = Omit<ActiveRound, "tableNumber" | "side" | "sitOut"> & {
  tableNumber: number | null;
  side?: "NS" | "EW";
  sitOut?: boolean;
};

/**
 * Turn this pair's flat board rows into per-round entries, resolving the
 * players at each round's table and flagging all-SIT_OUT rounds. Rounds are
 * returned in ascending round-number order.
 */
function assembleRounds(
  pairBoards: PairBoardRow[],
  assignmentToPlayers: Map<string, PairPlayers>,
  assignmentId: string,
): ActiveRound[] {
  // Group this pair's boards by round, and remember each round's NS/EW
  // assignment ids (constant within a round).
  const roundMap = new Map<
    number,
    {
      tableNumber: number;
      ns: string;
      ew: string;
      boards: { boardNumber: number; status: string | null }[];
    }
  >();

  for (const b of pairBoards) {
    if (!roundMap.has(b.roundNumber)) {
      roundMap.set(b.roundNumber, {
        tableNumber: b.tableNumber,
        ns: b.ns,
        ew: b.ew,
        boards: [],
      });
    }
    roundMap
      .get(b.roundNumber)!
      .boards.push({ boardNumber: b.boardNumber, status: b.status });
  }

  return Array.from(roundMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, data]) => {
      const nsPlayers = assignmentToPlayers.get(data.ns);
      const ewPlayers = assignmentToPlayers.get(data.ew);

      // A round whose boards are all SIT_OUT is a sit-out round for this pair.
      // It keeps its table (so the player is told where to wait) but exposes no
      // playable boards.
      const isSitOut =
        data.boards.length > 0 &&
        data.boards.every((b) => b.status === "SIT_OUT");

      // Which side this pair sits this round: they are the NS assignment, else
      // the EW one. Derived per round because some movements switch a pair's
      // direction between rounds (e.g. Howell, arrow switch).
      const side: "NS" | "EW" = data.ns === assignmentId ? "NS" : "EW";

      return {
        roundNumber,
        tableNumber: data.tableNumber,
        side,
        boards: isSitOut
          ? []
          : data.boards.map((b) => b.boardNumber).sort((a, b) => a - b),
        boardStatuses: isSitOut
          ? []
          : data.boards.sort((a, b) => a.boardNumber - b.boardNumber),
        sitOut: isSitOut,
        players: {
          N: nsPlayers?.player1 ?? null,
          S: nsPlayers?.player2 ?? null,
          E: ewPlayers?.player1 ?? null,
          W: ewPlayers?.player2 ?? null,
        },
      };
    });
}

/**
 * Pad the pair's active rounds up to `totalRounds`, inserting a tableless
 * sit-out marker for any round in which this pair has no board rows at all.
 */
function padSitOutRounds(
  rounds: ActiveRound[],
  totalRounds: number,
): ScheduleRound[] {
  const completeRounds: ScheduleRound[] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const activeRound = rounds.find((round) => round.roundNumber === r);
    if (activeRound) {
      completeRounds.push(activeRound);
    } else {
      completeRounds.push({
        roundNumber: r,
        tableNumber: null,
        boards: [],
        boardStatuses: [],
        players: { N: null, S: null, E: null, W: null },
        sitOut: true,
      });
    }
  }

  return completeRounds;
}
