import { APIRequestContext, expect } from "@playwright/test";
import { E2E_BASE_URL, E2E_GAMES_DIR } from "../e2e-env";
import { io as ioClient, Socket } from "socket.io-client";
import Database from "better-sqlite3";
import path from "node:path";

/**
 * Confirm every playable board instance in a started game by submitting a
 * matching Pass Out from BOTH sides of each (round, table, board), over a
 * direct socket connection from the test process. Leaves every pair's schedule
 * complete (so "all results in").
 *
 * A Howell rotates each pair's table and opponents every round, so driving a
 * single pair to completion through the UI is fragile. The board set is fully
 * described by the boards API: for each board number we read its instances
 * (round/table/status) and confirm the non-sit-out ones. Submitting from both
 * the two pairs at a table/round matches server-side and flips the board to
 * CONFIRMED, exactly as two tablets would. The pairs are the ones the board
 * row names, not the table's own seats: in a Howell a pair moves tables and
 * can sit either way, and its result counts for the side it sits.
 *
 * `game:submitResult` is player-authorised: each submission must carry the
 * seat's secret token (issued at join). We read those secrets directly from the
 * game's SQLite file (the seating already happened through the UI before this
 * runs) and attach the matching token to every submission.
 */
export async function confirmEntireGame(
  request: APIRequestContext,
  gameId: string,
  section = "A",
): Promise<void> {
  const {
    secretBySeat: seatSecrets,
    seatByPairId,
    pairsAt,
  } = readSeating(gameId);

  const boardsRes = await request.get(`/api/games/${gameId}/boards`);
  expect(boardsRes.ok()).toBeTruthy();
  const boardNumbers: number[] = (await boardsRes.json()).result.boards;

  type Instance = {
    roundNumber: number;
    tableNumber: number;
    boardNumber: number;
  };
  const instances: Instance[] = [];
  for (const boardNumber of boardNumbers) {
    const res = await request.get(`/api/games/${gameId}/boards/${boardNumber}`);
    expect(res.ok()).toBeTruthy();
    const rows: Array<Instance & { status: string | null }> = (await res.json())
      .result.instances;
    for (const row of rows) {
      if (row.status === "SIT_OUT") continue;
      instances.push({
        roundNumber: row.roundNumber,
        tableNumber: row.tableNumber,
        boardNumber: row.boardNumber,
      });
    }
  }

  const socket: Socket = ioClient(E2E_BASE_URL);
  try {
    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(
        () => reject(new Error("socket connect timeout")),
        10_000,
      );
      socket.on("connect", () => {
        clearTimeout(t);
        resolve();
      });
    });

    const submit = (seat: string, inst: Instance) =>
      new Promise<{ success: boolean; error?: string }>((resolve) => {
        const token = seatSecrets.get(seat);
        if (!token) {
          throw new Error(`No secret token found for seat ${seat}`);
        }
        socket.emit(
          "game:submitResult",
          {
            gameId,
            seat,
            token,
            roundNumber: inst.roundNumber,
            tableNumber: inst.tableNumber,
            boardNumber: inst.boardNumber,
            result: "PO",
          },
          (res: { success: boolean; error?: string }) => resolve(res),
        );
      });

    for (const inst of instances) {
      // Submit both pairs of a single instance back-to-back so the board
      // confirms (and its pending submissions clear) before the next one.
      const pairs = pairsAt(section, inst);
      const seatOf = (pairId: string | undefined, fallback: string) =>
        (pairId && seatByPairId.get(pairId)) ?? fallback;
      const ns = await submit(
        seatOf(pairs?.ns, `${section}${inst.tableNumber}NS`),
        inst,
      );
      expect(ns.success, `NS submit failed: ${ns.error}`).toBeTruthy();
      const ew = await submit(
        seatOf(pairs?.ew, `${section}${inst.tableNumber}EW`),
        inst,
      );
      expect(ew.success, `EW submit failed: ${ew.error}`).toBeTruthy();
    }
  } finally {
    socket.disconnect();
  }
}

/**
 * Read the seating straight from the game's SQLite file: every seat's secret
 * token keyed by the section-qualified initial seat (e.g. "A1NS"), mirroring
 * how the participant-auth middleware looks it up; the seat of each pair id
 * the board rows carry (its anchor id, or the seat itself); and the two pairs
 * a board row names.
 */
function readSeating(gameId: string): {
  secretBySeat: Map<string, string>;
  seatByPairId: Map<string, string>;
  pairsAt: (
    section: string,
    inst: { roundNumber: number; tableNumber: number; boardNumber: number },
  ) => { ns: string; ew: string } | undefined;
} {
  const dataDir = E2E_GAMES_DIR;
  const dbFile = path.join(dataDir, `${gameId}.db`);
  const db = new Database(dbFile, { readonly: true });
  try {
    const seats = db
      .prepare(
        "SELECT seat, anchor_id AS anchorId, secret_key AS secret FROM seat_occupancy WHERE standing != 'WITHOUT_STANDING' ORDER BY id ASC",
      )
      .all() as Array<{
      seat: string;
      anchorId: string | null;
      secret: string;
    }>;
    const secretBySeat = new Map<string, string>();
    const seatByPairId = new Map<string, string>();
    for (const row of seats) {
      secretBySeat.set(row.seat, row.secret);
      seatByPairId.set(row.anchorId ?? row.seat, row.seat);
    }
    const boardRows = db
      .prepare(
        "SELECT section, round_number AS roundNumber, table_number AS tableNumber, board_number AS boardNumber, ns, ew FROM boards",
      )
      .all() as Array<{
      section: string;
      roundNumber: number;
      tableNumber: number;
      boardNumber: number;
      ns: string;
      ew: string;
    }>;
    const key = (
      section: string,
      r: { roundNumber: number; tableNumber: number; boardNumber: number },
    ) => `${section}|${r.roundNumber}|${r.tableNumber}|${r.boardNumber}`;
    const pairs = new Map(
      boardRows.map((r) => [key(r.section, r), { ns: r.ns, ew: r.ew }]),
    );
    return {
      secretBySeat,
      seatByPairId,
      pairsAt: (section, inst) => pairs.get(key(section, inst)),
    };
  } finally {
    db.close();
  }
}
