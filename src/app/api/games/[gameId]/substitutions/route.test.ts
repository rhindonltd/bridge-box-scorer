import { describe, it, expect, vi, beforeEach } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";

vi.mock("@/db/games", () => ({ getDb: vi.fn() }));
vi.mock("@/socket/middleware/director-auth", () => ({
  validateDirectorToken: vi.fn(),
}));
vi.mock("@/db/games/queries/find-substitution-seats", () => ({
  findSubstitutionSeats: vi.fn(),
}));
vi.mock("@/db/games/actions/set-substitution-options", () => ({
  setSubstitutionOptions: vi.fn(),
}));
vi.mock("@/socket/broadcast/participant-broadcast", () => ({
  broadcastParticipants: vi.fn(),
}));
vi.mock("@/socket/handlers/results/broadcast-results", () => ({
  broadcastLeaderboardChanged: vi.fn(),
}));
vi.mock("@/socket/websocket", () => ({ getIO: vi.fn(() => null) }));

import { getDb } from "@/db/games";
import { validateDirectorToken } from "@/socket/middleware/director-auth";
import { findSubstitutionSeats } from "@/db/games/queries/find-substitution-seats";
import { setSubstitutionOptions } from "@/db/games/actions/set-substitution-options";
import * as appHandler from "./route";

const DIRECTOR_HEADERS = {
  "x-director-token": "dir-tok",
  "Content-Type": "application/json",
};
const params = { gameId: "g1" };

const sampleSeat = {
  seat: "A1NS",
  pair: "Late One & Late Two",
  playedCount: 2,
  missedCount: 2,
  split: false,
  occupants: [
    {
      id: 2,
      pair: "Late One & Late Two",
      boardCount: 2,
      eligible: true,
      isArrivalAnchor: true,
      isMainPair: true,
    },
    {
      id: 1,
      pair: "Early One & Early Two",
      boardCount: 2,
      eligible: true,
      isArrivalAnchor: false,
      isMainPair: false,
    },
  ],
};

describe("/api/games/[gameId]/substitutions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue({} as never);
    vi.mocked(validateDirectorToken).mockReturnValue(true);
  });

  describe("GET", () => {
    it("returns the substituted seats", async () => {
      vi.mocked(findSubstitutionSeats).mockResolvedValue([sampleSeat]);

      await testApiHandler({
        appHandler,
        params,
        test: async ({ fetch }) => {
          const res = await fetch({ method: "GET", headers: DIRECTOR_HEADERS });
          expect(res.status).toBe(200);
          await expect(res.json()).resolves.toEqual({
            success: true,
            result: { substitutions: [sampleSeat] },
          });
        },
      });
    });

    it("is readable without a director token (the write is the gated action)", async () => {
      vi.mocked(validateDirectorToken).mockReturnValue(false);
      vi.mocked(findSubstitutionSeats).mockResolvedValue([]);
      await testApiHandler({
        appHandler,
        params,
        test: async ({ fetch }) => {
          const res = await fetch({ method: "GET" });
          expect(res.status).toBe(200);
          expect(findSubstitutionSeats).toHaveBeenCalled();
        },
      });
    });
  });

  describe("PATCH", () => {
    it("sets the split + eligibility options and returns success", async () => {
      vi.mocked(setSubstitutionOptions).mockResolvedValue(true);

      await testApiHandler({
        appHandler,
        params,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: "PATCH",
            headers: DIRECTOR_HEADERS,
            body: JSON.stringify({
              seat: "A1NS",
              split: true,
              eligibility: [
                { id: 2, eligible: true },
                { id: 1, eligible: false },
              ],
            }),
          });
          expect(res.status).toBe(200);
          expect(setSubstitutionOptions).toHaveBeenCalledWith("g1", "A1NS", {
            split: true,
            eligibility: [
              { id: 2, eligible: true },
              { id: 1, eligible: false },
            ],
          });
        },
      });
    });

    it("returns 404 when no pair is seated at the seat", async () => {
      vi.mocked(setSubstitutionOptions).mockResolvedValue(false);

      await testApiHandler({
        appHandler,
        params,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: "PATCH",
            headers: DIRECTOR_HEADERS,
            body: JSON.stringify({
              seat: "Z9NS",
              split: false,
              eligibility: [{ id: 1, eligible: true }],
            }),
          });
          expect(res.status).toBe(404);
        },
      });
    });

    it("rejects a body missing the eligibility array", async () => {
      await testApiHandler({
        appHandler,
        params,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: "PATCH",
            headers: DIRECTOR_HEADERS,
            body: JSON.stringify({ seat: "A1NS", split: true }),
          });
          expect(res.status).toBe(400);
          expect(setSubstitutionOptions).not.toHaveBeenCalled();
        },
      });
    });

    it("returns 401 without a valid director token", async () => {
      vi.mocked(validateDirectorToken).mockReturnValue(false);
      await testApiHandler({
        appHandler,
        params,
        test: async ({ fetch }) => {
          const res = await fetch({
            method: "PATCH",
            headers: DIRECTOR_HEADERS,
            body: JSON.stringify({
              seat: "A1NS",
              split: false,
              eligibility: [{ id: 1, eligible: true }],
            }),
          });
          expect(res.status).toBe(401);
          expect(setSubstitutionOptions).not.toHaveBeenCalled();
        },
      });
    });
  });
});
