import { APIRequestContext, expect } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";

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
 * the NS and EW seat of a table/round matches server-side and flips the board
 * to CONFIRMED, exactly as two tablets would.
 */
export async function confirmEntireGame(
  request: APIRequestContext,
  gameId: string,
  section = "A",
): Promise<void> {
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
    const rows: Array<Instance & { status: string | null }> = (
      await res.json()
    ).result.instances;
    for (const row of rows) {
      if (row.status === "SIT_OUT") continue;
      instances.push({
        roundNumber: row.roundNumber,
        tableNumber: row.tableNumber,
        boardNumber: row.boardNumber,
      });
    }
  }

  const socket: Socket = ioClient("http://localhost:3000");
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
        socket.emit(
          "game:submitResult",
          {
            gameId,
            seat,
            roundNumber: inst.roundNumber,
            tableNumber: inst.tableNumber,
            boardNumber: inst.boardNumber,
            result: "PO",
          },
          (res: { success: boolean; error?: string }) => resolve(res),
        );
      });

    for (const inst of instances) {
      await submit(`${section}${inst.tableNumber}NS`, inst);
      await submit(`${section}${inst.tableNumber}EW`, inst);
    }
  } finally {
    socket.disconnect();
  }
}
