import { test, expect } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";

import { deleteGame } from "../fixtures/delete-game";
import { confirmBoardPassOut } from "../fixtures/play";
import { newParticipant, setUpStartedTwoTableGame } from "./support";

/**
 * Real-time internals journey (direct socket client, no browser page).
 *
 * Asserts the room-join contract that the data-flow design depends on:
 *
 *   - `game:join` is a DUMB room-join. Joining a game (and its section) must
 *     NOT replay any feature state — no leaderboard:sync, traveller:sync or
 *     game:participants is pushed as a side effect of joining, even when
 *     results already exist. (If join replayed state, every client would get
 *     sprayed with every feature's data on connect.)
 *   - The current state is instead delivered on demand: emitting
 *     `leaderboard:requestState` returns the snapshot on its acknowledgement
 *     callback. This is the source of truth clients rely on.
 *
 * The socket→SWR bridge (`useSocketSWRSync`) itself is a client-only React hook
 * with no server-observable behaviour of its own; it is unit-tested at
 * `src/hooks/socket-swr-sync.test.ts`. Its live effect (a pushed event updating
 * the SWR cache) is already exercised end to end by the seating-detail and
 * traveller journeys, so it is not re-driven here.
 */

const SERVER = "http://localhost:3000";

interface LeaderboardSnapshot {
  leaderboard: unknown;
  sections: unknown[];
}

/** Connect a raw socket.io client and resolve once connected. */
async function connect(): Promise<Socket> {
  const socket = ioClient(SERVER, { forceNew: true });
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("connect timeout")), 10_000);
    socket.on("connect", () => {
      clearTimeout(t);
      resolve();
    });
  });
  return socket;
}

test.describe("Real-time internals: game:join does not replay feature state", () => {
  test("joining pushes no feature state; requestState returns the snapshot", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // A started game with one confirmed board, so a leaderboard snapshot
    // genuinely exists to (not) be replayed on join.
    const { directorPage, gameId } = await setUpStartedTwoTableGame(
      browser,
      `Realtime Join ${Date.now()}`,
      { recordOpeningLead: false },
    );
    const nsPage = await newParticipant(browser);
    const ewPage = await newParticipant(browser);

    let socket: Socket | null = null;
    try {
      await confirmBoardPassOut(nsPage, ewPage, gameId, 1, 1);

      socket = await connect();

      // Record any feature-state pushes that arrive as a side effect of
      // joining. None should.
      const pushed: string[] = [];
      const record = (name: string) => () => pushed.push(name);
      socket.on("leaderboard:sync", record("leaderboard:sync"));
      socket.on("traveller:sync", record("traveller:sync"));
      socket.on("game:participants", record("game:participants"));

      // Join the game room (and its section). The ack fires, proving the join
      // succeeded — but it carries no feature state.
      const joinAck = await new Promise<{ success: boolean }>((resolve) => {
        socket!.emit("game:join", { gameId, section: "A" }, resolve);
      });
      expect(joinAck.success).toBe(true);

      // Give the server a window to (wrongly) emit any replay. Nothing should
      // arrive purely from joining.
      await new Promise((r) => setTimeout(r, 1500));
      expect(pushed).toEqual([]);

      // The snapshot is delivered ON DEMAND via requestState — this is the
      // source of truth, not join. The ack returns the current leaderboard
      // (non-null, since a board is confirmed).
      const snapshot = await new Promise<LeaderboardSnapshot | null>(
        (resolve) => {
          socket!.emit("leaderboard:requestState", { gameId }, resolve);
        },
      );
      expect(snapshot).not.toBeNull();
      expect(snapshot!.leaderboard).not.toBeNull();
    } finally {
      if (socket) socket.disconnect();
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
      await nsPage.context().close();
      await ewPage.context().close();
    }
  });
});
