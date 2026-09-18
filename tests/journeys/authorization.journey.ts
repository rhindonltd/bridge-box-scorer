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
 *     a player seats their own pair WITHOUT a director token, and a share code
 *     is claimed without any prior auth (the claimant has no token yet).
 *   - Result submission is PLAYER-authed: it requires the seat's own token
 *     (issued at join), so a submission without it is rejected — the happy path
 *     is covered by the play journeys.
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
  test("a director-only socket event rejects missing/invalid tokens", async ({
    browser,
  }) => {
    test.setTimeout(90_000);

    // A game whose director-only socket events reach their auth check.
    // `traveller:overrideResult` is a representative director-only socket event
    // that acks its own Unauthorized failure; share-code generate/claim are now
    // HTTP routes (covered below and in the HTTP-routes describe).
    const directorPage = await newParticipant(browser);
    const { gameId, directorToken } = await createGame(directorPage, {
      eventName: `Auth ${Date.now()}`,
      recordOpeningLead: false,
    });
    await setTableCount(directorPage, 2);
    await pickFirstMovement(directorPage);

    const socket = await openSocket();

    // A fully valid-shaped override payload (all required fields present) so
    // the request passes schema validation and reaches the director auth check.
    const overridePayload = {
      gameId,
      boardNumber: 1,
      roundNumber: 1,
      tableNumber: 1,
      result: "PO",
    };

    try {
      // A garbage token is rejected as Unauthorized (a valid-shaped but
      // unrecognised token reaches the auth check).
      const garbage = await emit(socket, "traveller:overrideResult", {
        ...overridePayload,
        directorToken: "garbage-token",
      });
      expect(garbage.success).toBe(false);
      expect(garbage.error).toBe("Unauthorized");

      // A missing token is also rejected (payload validation fires first,
      // before the auth check — still a non-success ack).
      const missing = await emit(socket, "traveller:overrideResult", overridePayload);
      expect(missing.success).toBe(false);

      // Positive control: the real director token passes the auth check. (This
      // game has no played board 1 to override, so the override itself does not
      // succeed — but it gets PAST auth, i.e. it is NOT rejected as
      // Unauthorized, which is what this test asserts.)
      const authed = await emit<{ success: boolean; error?: string }>(
        socket,
        "traveller:overrideResult",
        { ...overridePayload, directorToken },
      );
      expect(authed.error).not.toBe("Unauthorized");
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

  test("a result submission without the seat's player token is rejected", async ({
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
      // Result submission is PLAYER-authed: the payload must carry the seat's
      // own token (issued at join). A raw socket that never seated has no such
      // token, so the submission is rejected as Unauthorized. (The happy path —
      // a seated player submitting with their token — is covered end to end by
      // the play-flow / mismatch journeys.)
      const res = await emit(playerSocket, "game:submitResult", {
        gameId,
        seat: "A1NS",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        result: "PO",
      });
      expect(res.success).toBe(false);
      expect(res.error).toBe("Unauthorized");
    } finally {
      playerSocket.disconnect();
      await deleteGame(directorPage, gameId);
      await directorPage.context().close();
    }
  });

  test("a share code is claimed without prior auth and bad codes are rejected", async ({
    browser,
    request,
  }) => {
    test.setTimeout(90_000);

    const directorPage = await newParticipant(browser);
    const { gameId, directorToken } = await createGame(directorPage, {
      eventName: `Claim Auth ${Date.now()}`,
      recordOpeningLead: false,
    });

    try {
      // Director generates a code (authorised via the director token header).
      // Share codes are HTTP routes now, not socket events.
      const genRes = await request.post(`/api/games/${gameId}/share-code`, {
        headers: { "x-director-token": directorToken },
      });
      expect(genRes.ok()).toBe(true);
      const code = (await genRes.json()).result.code as string;
      expect(code).toMatch(/^[A-Z0-9]{6}$/);

      // A bad code is rejected (no auth required to try) — 400 client error.
      const badRes = await request.post("/api/director-codes/claim", {
        data: { code: "ZZZZZZ" },
      });
      expect(badRes.ok()).toBe(false);
      expect(badRes.status()).toBe(400);

      // The real code is claimed with NO prior auth, minting a director token.
      const claimRes = await request.post("/api/director-codes/claim", {
        data: { code },
      });
      expect(claimRes.ok()).toBe(true);
      const claim = (await claimRes.json()).result as {
        directorToken?: string;
        gameId?: string;
      };
      expect(claim.directorToken).toBeTruthy();
      expect(claim.gameId).toBe(gameId);
    } finally {
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

  // PBN export is also a director-authed GET: no token and a bogus token -> 401.
  const pbnNoToken = await request.get(`/api/games/${gameId}/pbn`);
  expect(pbnNoToken.status()).toBe(401);
  const pbnBadToken = await request.get(`/api/games/${gameId}/pbn`, {
    headers: { "x-director-token": "garbage" },
  });
  expect(pbnBadToken.status()).toBe(401);

  // BridgeWebs upload is a director-authed POST: no token and a bogus token ->
  // 401 (auth runs before any BridgeWebs call, so this never hits the network).
  const bwNoToken = await request.post(
    `/api/games/${gameId}/bridgewebs/upload`,
  );
  expect(bwNoToken.status()).toBe(401);
  const bwBadToken = await request.post(
    `/api/games/${gameId}/bridgewebs/upload`,
    { headers: { "x-director-token": "garbage" } },
  );
  expect(bwBadToken.status()).toBe(401);

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
