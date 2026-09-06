import { test, expect, APIRequestContext } from "@playwright/test";
import { io as ioClient, Socket } from "socket.io-client";

import { createGame } from "../fixtures/game-create";
import { setTableCount, pickFirstMovement } from "../fixtures/game-setup";
import { seatTwoTableField } from "../fixtures/join";
import { deleteGame } from "../fixtures/delete-game";
import { newParticipant } from "./support";

/**
 * Authorization journey — the director/admin auth model.
 *
 * Asserts, over a direct socket + the HTTP API:
 *   - Director-only socket events reject a missing/invalid token
 *     ({ success:false, error:"Unauthorized" }) and succeed with the real one.
 *   - HTTP director routes 401 without a valid token; admin routes 401 without
 *     x-admin-token.
 *   - The intentionally-OPEN events behave as designed (documented below):
 *     players submit results and seat themselves WITHOUT a director token, and
 *     a share code is claimed without any prior auth. These are open by design
 *     — the integrity mechanism for results is dual-side confirmation, not
 *     director authorization, and a claimant has no token yet.
 */

/** Open a raw socket.io connection from the test process. */
async function openSocket(): Promise<Socket> {
  const socket = ioClient("http://localhost:3000");
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("socket connect timeout")), 10_000);
    socket.on("connect", () => {
      clearTimeout(t);
      resolve();
    });
  });
  return socket;
}

/** Emit an event and resolve with its ack. */
function emit<T = { success: boolean; error?: string }>(
  socket: Socket,
  event: string,
  payload: unknown,
): Promise<T> {
  return new Promise<T>((resolve) => {
    socket.emit(event, payload, (res: T) => resolve(res));
  });
}

test.describe("Authorization: director socket events", () => {
  test("director-only events reject missing/invalid tokens and accept the real one", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // A started, seated game so director events reach their auth check.
    const directorPage = await newParticipant(browser);
    const { gameId, directorToken } = await createGame(directorPage, {
      eventName: `Auth ${Date.now()}`,
      recordOpeningLead: false,
    });
    await setTableCount(directorPage, 2);
    await pickFirstMovement(directorPage);
    await seatTwoTableField(directorPage, gameId);

    const socket = await openSocket();

    try {
      // A garbage token is rejected as Unauthorized (a valid-shaped but
      // unrecognised token reaches the auth check).
      const garbage = await emit(socket, "game:generateShareCode", {
        gameId,
        directorToken: "garbage-token",
      });
      expect(garbage.success).toBe(false);
      expect(garbage.error).toBe("Unauthorized");

      // A missing token is also rejected (payload validation fires first,
      // before the auth check — still a non-success ack).
      const missing = await emit(socket, "game:generateShareCode", { gameId });
      expect(missing.success).toBe(false);

      // evictParticipant and updateTables are director-gated too.
      const evict = await emit(socket, "game:evictParticipant", {
        gameId,
        seat: "A1NS",
        directorToken: "garbage-token",
      });
      expect(evict.success).toBe(false);
      expect(evict.error).toBe("Unauthorized");

      const tables = await emit(socket, "game:updateTables", {
        gameId,
        section: "A",
        tables: 3,
        directorToken: "garbage-token",
      });
      expect(tables.success).toBe(false);
      expect(tables.error).toBe("Unauthorized");

      // Positive control: the real director token authorises the event.
      const ok = await emit<{ success: boolean; code?: string }>(
        socket,
        "game:generateShareCode",
        { gameId, directorToken },
      );
      expect(ok.success).toBe(true);
      expect(ok.code).toMatch(/^[A-Z0-9]{6}$/);
    } finally {
      socket.disconnect();
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });
});

test.describe("Authorization: intentionally-open events (by design)", () => {
  test("a player creates a participant without a director token", async ({
    browser,
  }) => {
    test.setTimeout(60_000);

    // A fresh game with a table count set (so seats exist) but not seated.
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Open Seat ${Date.now()}`,
      recordOpeningLead: false,
    });
    await setTableCount(directorPage, 2);
    await pickFirstMovement(directorPage);

    const playerSocket = await openSocket();
    try {
      // NO director token — a player seats their own pair. Accepted by design.
      const created = await emit<{ success: boolean }>(
        playerSocket,
        "game:createParticipant",
        {
          gameId,
          newParticipant: {
            initialSeat: "A1NS",
            player1: { firstName: "Test", lastName: "One", nationalId: null },
            player2: { firstName: "Test", lastName: "Two", nationalId: null },
          },
        },
      );
      expect(created.success).toBe(true);
    } finally {
      playerSocket.disconnect();
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });

  test("a player submits a result without a director token", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // A started, fully-seated game so board 1 exists to submit against.
    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Open Submit ${Date.now()}`,
      recordOpeningLead: false,
    });
    await setTableCount(directorPage, 2);
    await pickFirstMovement(directorPage);
    await seatTwoTableField(directorPage, gameId);
    const { startGame } = await import("../fixtures/game-setup");
    await startGame(directorPage, gameId);

    const playerSocket = await openSocket();
    try {
      // NO director token — a player submits their own result. Accepted by
      // design (dual-side confirmation is the integrity mechanism).
      const res = await emit(playerSocket, "game:submitResult", {
        gameId,
        seat: "A1NS",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "PO",
      });
      expect(res.success).toBe(true);
    } finally {
      playerSocket.disconnect();
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });

  test("a share code is claimed without prior auth and bad codes are rejected", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    const directorPage = await newParticipant(browser);
    const { gameId, directorToken } = await createGame(directorPage, {
      eventName: `Claim Auth ${Date.now()}`,
      recordOpeningLead: false,
    });

    const dirSocket = await openSocket();
    const claimantSocket = await openSocket();

    try {
      // Director generates a code (authorised).
      const gen = await emit<{ success: boolean; code?: string }>(
        dirSocket,
        "game:generateShareCode",
        { gameId, directorToken },
      );
      expect(gen.success).toBe(true);
      const code = gen.code!;

      // A bad code is rejected (no auth required to try).
      const bad = await emit<{ success: boolean; error?: string }>(
        claimantSocket,
        "game:claimDirectorCode",
        { code: "ZZZZZZ" },
      );
      expect(bad.success).toBe(false);

      // The real code is claimed with NO prior auth, minting a director token.
      const claim = await emit<{
        success: boolean;
        directorToken?: string;
        gameId?: string;
      }>(claimantSocket, "game:claimDirectorCode", { code });
      expect(claim.success).toBe(true);
      expect(claim.directorToken).toBeTruthy();
      expect(claim.gameId).toBe(gameId);
    } finally {
      dirSocket.disconnect();
      claimantSocket.disconnect();
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });
});

test.describe("Authorization: HTTP routes", () => {
  test("director and admin routes reject unauthenticated calls", async ({
    browser,
    request,
  }) => {
    test.setTimeout(90_000);

    const directorPage = await newParticipant(browser);
    const { gameId } = await createGame(directorPage, {
      eventName: `Http Auth ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      await assertDirectorAndAdminRoutes(request, gameId);
    } finally {
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });
});

async function assertDirectorAndAdminRoutes(
  request: APIRequestContext,
  gameId: string,
): Promise<void> {
  // Director route (USEBIO GET) without a token header -> 401.
  const usebioNoToken = await request.get(`/api/games/${gameId}/usebio`);
  expect(usebioNoToken.status()).toBe(401);

  // Director route with a bogus token -> 401.
  const usebioBadToken = await request.get(`/api/games/${gameId}/usebio`, {
    headers: { "x-director-token": "garbage" },
  });
  expect(usebioBadToken.status()).toBe(401);

  // Director DELETE without a token in the body -> 400/401 (never deletes).
  const delNoToken = await request.delete(`/api/games/${gameId}/delete`, {
    data: {},
  });
  expect([400, 401]).toContain(delNoToken.status());

  // Admin routes without x-admin-token -> 401.
  const club = await request.post("/api/system/club", {
    data: { name: "X", clubNumber: "1" },
  });
  expect(club.status()).toBe(401);

  const adminKey = await request.post("/api/system/admin-key", {
    data: { key: "a-new-key" },
  });
  expect(adminKey.status()).toBe(401);
}
