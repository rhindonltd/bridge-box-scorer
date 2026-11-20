import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/game-index/queries/find-game-by-id", () => ({
  findGameById: vi.fn(),
}));
vi.mock("@/socket/broadcast/director-alerts", () => ({
  raiseDirectorAlert: vi.fn(() => ({ id: "alert-1" })),
}));
vi.mock("./identify-device", () => ({
  identifyDevice: vi.fn(async () => []),
}));

import { findGameById } from "@/db/game-index/queries/find-game-by-id";
import { raiseDirectorAlert } from "@/socket/broadcast/director-alerts";
import { resetSignInAttempts } from "@/lib/security/sign-in-attempts";
import { CLIENT_ADDRESS_HEADER } from "@/lib/net/client-address";
import { identifyDevice } from "./identify-device";
import {
  blockedResponse,
  heldSeatsSchema,
  originIdSchema,
  signInFailed,
  signInSucceeded,
} from "./sign-in-guard";

const req = (address = "192.168.4.9") =>
  new Request("http://x", { headers: { [CLIENT_ADDRESS_HEADER]: address } });
const game = { kind: "game", gameId: "g1" } as const;
const settings = { kind: "settings" } as const;
const seats = [{ gameId: "g1", seat: "A3NS", token: "t" }];

describe("sign-in guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSignInAttempts();
    vi.mocked(findGameById).mockResolvedValue({
      eventName: "Monday Pairs",
    } as never);
  });

  it("accepts a short origin id", () => {
    expect(originIdSchema.safeParse("abc").success).toBe(true);
    expect(originIdSchema.safeParse("x".repeat(65)).success).toBe(false);
  });

  it("accepts up to ten held seats", () => {
    expect(heldSeatsSchema.safeParse(seats).success).toBe(true);
    expect(heldSeatsSchema.safeParse(undefined).success).toBe(true);
    expect(
      heldSeatsSchema.safeParse(Array.from({ length: 11 }, () => seats[0]))
        .success,
    ).toBe(false);
  });

  it("raises a sign-in alert for the game, carrying the device's origin id", async () => {
    await signInSucceeded(req(), game, "adminKey", seats, "origin-1");
    expect(identifyDevice).toHaveBeenCalledWith(seats);
    expect(raiseDirectorAlert).toHaveBeenCalledWith({
      kind: "signedIn",
      audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
      method: "adminKey",
      seatedAs: [],
      originId: "origin-1",
    });
  });

  it("leaves the origin id out when the device sent none", async () => {
    await signInSucceeded(req(), game, "shareCode", undefined);
    expect(raiseDirectorAlert).toHaveBeenCalledWith(
      expect.not.objectContaining({ originId: expect.anything() }),
    );
  });

  it("raises a Settings sign-in alert, with no seats sent", async () => {
    await signInSucceeded(req(), settings, "adminKey", undefined);
    expect(identifyDevice).toHaveBeenCalledWith([]);
    expect(raiseDirectorAlert).toHaveBeenCalledWith(
      expect.objectContaining({ audience: { kind: "settings" } }),
    );
  });

  it("names a deleted game rather than failing", async () => {
    vi.mocked(findGameById).mockResolvedValue(null as never);
    await signInSucceeded(req(), game, "shareCode", undefined);
    expect(raiseDirectorAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: {
          kind: "game",
          gameId: "g1",
          eventName: "a game that no longer exists",
        },
      }),
    );
  });

  it("alerts once on the third failure, for each target, then blocks", async () => {
    await signInFailed(req(), game, seats);
    await signInFailed(req(), settings, seats);
    expect(raiseDirectorAlert).not.toHaveBeenCalled();
    expect(blockedResponse(req())).toBeNull();

    await signInFailed(req(), game, seats);
    expect(raiseDirectorAlert).toHaveBeenCalledTimes(2);
    expect(raiseDirectorAlert).toHaveBeenCalledWith({
      kind: "repeatedFailures",
      audience: { kind: "game", gameId: "g1", eventName: "Monday Pairs" },
      failures: 3,
      blockedMinutes: 5,
      seatedAs: [],
    });
    expect(raiseDirectorAlert).toHaveBeenCalledWith(
      expect.objectContaining({ audience: { kind: "settings" } }),
    );

    const res = blockedResponse(req());
    expect(res?.status).toBe(429);
    await expect(res?.json()).resolves.toEqual({
      success: false,
      error: "Too many attempts. Try again in 5 minutes.",
    });
    // Another device is unaffected.
    expect(blockedResponse(req("192.168.4.10"))).toBeNull();
  });

  it("says '1 minute' near the end of a block", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(0);
      for (let i = 0; i < 3; i++) await signInFailed(req(), game, undefined);
      vi.setSystemTime(5 * 60 * 1000 - 1000);
      await expect(blockedResponse(req())?.json()).resolves.toMatchObject({
        error: "Too many attempts. Try again in 1 minute.",
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("a success clears the device's failures", async () => {
    await signInFailed(req(), game, undefined);
    await signInFailed(req(), game, undefined);
    await signInSucceeded(req(), game, "shareCode", undefined);
    vi.mocked(raiseDirectorAlert).mockClear();
    await signInFailed(req(), game, undefined);
    expect(raiseDirectorAlert).not.toHaveBeenCalled();
  });
});
