import "server-only";

import { eq, or } from "drizzle-orm";
import { Db } from "@/db/games";
import { boards as pairsBoards } from "@/db/games/tables/boards";
import { assignments as pairAssignments } from "@/db/games/tables/assignments";
import { participants as pairParticipants } from "@/db/games/tables/participants";
import { players } from "@/db/games/tables/players";
import { PairSeat } from "@/model/participants";

export async function getSchedule(db: Db, seat: string) {
  // Look up assignment ID for this seat
  const assignment = await db
    .select()
    .from(pairAssignments)
    .where(eq(pairAssignments.initialSeat, seat as PairSeat))
    .get();

  if (!assignment) {
    return null;
  }

  const assignmentId = assignment.id;

  // The pair's side for submission is based on the initialSeat suffix
  const side: "NS" | "EW" = seat.endsWith("NS") ? "NS" : "EW";

  // Query all boards where this pair appears as NS or EW
  const allBoards = await db
    .select()
    .from(pairsBoards)
    .where(
      or(eq(pairsBoards.ns, assignmentId), eq(pairsBoards.ew, assignmentId)),
    );

  // Group by round
  const roundMap = new Map<
    number,
    {
      tableNumber: number;
      boards: { boardNumber: number; status: string | null }[];
    }
  >();

  for (const b of allBoards) {
    if (!roundMap.has(b.roundNumber)) {
      roundMap.set(b.roundNumber, { tableNumber: b.tableNumber, boards: [] });
    }
    roundMap
      .get(b.roundNumber)!
      .boards.push({ boardNumber: b.boardNumber, status: b.status });
  }

  // Build player lookup: assignment ID -> { player1: Player, player2: Player }
  const allAssignmentRows = await db.select().from(pairAssignments);
  const allParticipantRows = await db.select().from(pairParticipants);
  const allPlayerRows = await db.select().from(players);

  const playerById = new Map(allPlayerRows.map((p) => [p.id, p]));

  // Map: assignment ID -> initialSeat
  const assignmentSeatMap = new Map(
    allAssignmentRows.map((a) => [a.id, a.initialSeat]),
  );

  // Map: initialSeat -> { player1: Player, player2: Player }
  const seatToPlayers = new Map<
    string,
    { player1: (typeof allPlayerRows)[0]; player2: (typeof allPlayerRows)[0] }
  >();
  for (const p of allParticipantRows) {
    const p1 = playerById.get(p.player1);
    const p2 = playerById.get(p.player2);
    if (p1 && p2 && p.initialSeat) {
      seatToPlayers.set(p.initialSeat, { player1: p1, player2: p2 });
    }
  }

  // Map: assignment ID -> { player1, player2 }
  const assignmentToPlayers = new Map<
    string,
    { player1: (typeof allPlayerRows)[0]; player2: (typeof allPlayerRows)[0] }
  >();
  for (const [id, initialSeat] of assignmentSeatMap) {
    const playersForSeat = initialSeat
      ? seatToPlayers.get(initialSeat)
      : undefined;
    if (playersForSeat) {
      assignmentToPlayers.set(id, playersForSeat);
    }
  }

  // We need NS/EW assignment IDs per round — get from the original board rows
  const roundNsEw = new Map<number, { ns: string; ew: string }>();
  for (const b of allBoards) {
    if (!roundNsEw.has(b.roundNumber)) {
      roundNsEw.set(b.roundNumber, { ns: b.ns, ew: b.ew });
    }
  }

  const rounds = Array.from(roundMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([roundNumber, data]) => {
      const nsEw = roundNsEw.get(roundNumber);
      const nsPlayers = nsEw ? assignmentToPlayers.get(nsEw.ns) : undefined;
      const ewPlayers = nsEw ? assignmentToPlayers.get(nsEw.ew) : undefined;

      return {
        roundNumber,
        tableNumber: data.tableNumber,
        boards: data.boards.map((b) => b.boardNumber).sort((a, b) => a - b),
        boardStatuses: data.boards.sort(
          (a, b) => a.boardNumber - b.boardNumber,
        ),
        players: {
          N: nsPlayers?.player1 ?? null,
          S: nsPlayers?.player2 ?? null,
          E: ewPlayers?.player1 ?? null,
          W: ewPlayers?.player2 ?? null,
        },
      };
    });

  // Determine total rounds from ALL boards in the game (not just this player's)
  const allGameBoards = await db
    .select({ roundNumber: pairsBoards.roundNumber })
    .from(pairsBoards);
  const allRoundNumbers = new Set(allGameBoards.map((b) => b.roundNumber));
  const totalRounds =
    allRoundNumbers.size > 0 ? Math.max(...allRoundNumbers) : 0;

  // Build complete schedule including sit-outs. A round is either an active
  // round (widened so tableNumber may be null) or a sit-out marker.
  type ActiveRound = (typeof rounds)[number];
  type ScheduleRound = Omit<ActiveRound, "tableNumber"> & {
    tableNumber: number | null;
    sitOut?: boolean;
  };

  const completeRounds: ScheduleRound[] = [];

  for (let r = 1; r <= totalRounds; r++) {
    const activeRound = rounds.find((round) => round.roundNumber === r);
    if (activeRound) {
      completeRounds.push(activeRound);
    } else {
      // Sit-out round
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

  return { assignmentId, side, rounds: completeRounds };
}
