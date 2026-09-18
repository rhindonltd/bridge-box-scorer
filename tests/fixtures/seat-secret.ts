import { io as ioClient, Socket } from "socket.io-client";
import Database from "better-sqlite3";
import path from "node:path";

/**
 * Helpers for observing the seat-transfer secret ROTATION end to end.
 *
 * A seat's `secretKey` (in the per-game `participant` table) is the credential
 * the result-submission handler checks. The "change device" claim rotates it,
 * invalidating the old device. These helpers let a journey read that secret
 * directly and submit a result over a raw socket with an arbitrary token, so it
 * can assert the OLD token is rejected (Unauthorized) and the NEW one accepted.
 */

/**
 * Read the current secret key for a section-qualified seat (e.g. "A1NS")
 * straight from the game's SQLite file. Mirrors how the participant-auth
 * middleware resolves the seat secret server-side.
 */
export function readSeatSecret(gameId: string, seat: string): string | null {
  const dataDir = process.env.DATABASE_GAMES_URL ?? "./data/games";
  const dbFile = path.join(dataDir, `${gameId}.db`);

  const db = new Database(dbFile, { readonly: true });
  try {
    const row = db
      .prepare(
        "SELECT secret_key AS secret FROM participant WHERE initial_seat = ?",
      )
      .get(seat) as { secret: string } | undefined;
    return row?.secret ?? null;
  } finally {
    db.close();
  }
}

export interface SubmitResultArgs {
  gameId: string;
  seat: string;
  token: string;
  roundNumber: number;
  tableNumber: number;
  boardNumber: number;
  /** Result code; defaults to a Pass Out ("PO"). */
  result?: string;
}

/**
 * Submit a board result over a fresh, direct socket connection using the given
 * token, and resolve with the server's ack. Used to prove that a token
 * authorises (or no longer authorises) submissions for a seat — the same
 * `game:submitResult` path the player UI uses.
 */
export async function submitResultViaSocket(
  args: SubmitResultArgs,
): Promise<{ success: boolean; error?: string }> {
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

    return await new Promise<{ success: boolean; error?: string }>(
      (resolve) => {
        socket.emit(
          "game:submitResult",
          {
            gameId: args.gameId,
            seat: args.seat,
            token: args.token,
            roundNumber: args.roundNumber,
            tableNumber: args.tableNumber,
            boardNumber: args.boardNumber,
            result: args.result ?? "PO",
          },
          (res: { success: boolean; error?: string }) => resolve(res),
        );
      },
    );
  } finally {
    socket.disconnect();
  }
}
