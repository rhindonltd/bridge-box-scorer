import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/find-club", () => ({ findClub: vi.fn() }));
vi.mock("@/db/system/queries/ebu-credentials", () => ({
  getEbuCredentials: vi.fn(),
}));
vi.mock("@/services/usebio-service", () => ({ generateUsebio: vi.fn() }));
vi.mock("@/lib/ebu/client", () => ({
  parseUsebio: vi.fn(),
  checkSessionDate: vi.fn(),
  checkPlayers: vi.fn(),
  submitSession: vi.fn(),
}));

import { findClub } from "@/db/system/queries/find-club";
import { getEbuCredentials } from "@/db/system/queries/ebu-credentials";
import { generateUsebio } from "@/services/usebio-service";
import {
  parseUsebio,
  checkSessionDate,
  checkPlayers,
  submitSession,
} from "@/lib/ebu/client";
import { uploadResultsToEbu } from "@/services/ebu-upload-service";
import type { BridgeGame } from "@/db/game-index/schema";
import type { Db } from "@/db/games";

const db = {} as Db;

function makeGame(overrides: Partial<BridgeGame> = {}): BridgeGame {
  return {
    gameId: "g1",
    eventName: "Monday Pairs!",
    director: "Di",
    gameType: "PAIRS",
    scoringType: "MP",
    sectionName: "",
    eventDate: "2026-09-17T00:00:00.000Z",
    tables: 5,
    selectedMovement: null,
    leadCardRequired: true,
    handEntryEnabled: false,
    bridgewebsEventId: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  } as BridgeGame;
}

describe("uploadResultsToEbu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findClub).mockResolvedValue({
      id: 1,
      name: "Test BC",
      clubNumber: "123",
    });
    vi.mocked(getEbuCredentials).mockResolvedValue({
      ebuNumber: "123456",
      password: "secret",
    });
    vi.mocked(generateUsebio).mockResolvedValue("<USEBIO/>");
    // A session JSON with one player carrying an ebu + surname.
    vi.mocked(parseUsebio).mockResolvedValue({
      player: { ebu: "1", surname: "Shears" },
    });
    vi.mocked(checkSessionDate).mockResolvedValue({
      sims: [],
      duplicates: 0,
    });
    vi.mocked(checkPlayers).mockResolvedValue({
      players: [{ ebu: "1", surname: "Shears", check: "KEY1" }],
      badEbus: 0,
      mismatches: 0,
    });
    vi.mocked(submitSession).mockResolvedValue({
      ok: true,
      sessionId: "EBU-999",
      warnings: [],
    });
  });

  it("blocks when club info is not configured", async () => {
    vi.mocked(findClub).mockResolvedValue(null);
    const result = await uploadResultsToEbu(db, makeGame());
    expect(result).toEqual({ status: "blocked", reason: "club" });
    expect(parseUsebio).not.toHaveBeenCalled();
  });

  it("blocks when EBU credentials are not configured", async () => {
    vi.mocked(getEbuCredentials).mockResolvedValue(null);
    const result = await uploadResultsToEbu(db, makeGame());
    expect(result).toEqual({ status: "blocked", reason: "credentials" });
    expect(parseUsebio).not.toHaveBeenCalled();
  });

  it("runs parse -> check-players -> submit and returns the EBU outcome", async () => {
    const result = await uploadResultsToEbu(db, makeGame());

    expect(parseUsebio).toHaveBeenCalledOnce();
    // The date check uses the YYYYMMDD form of the event date.
    expect(checkSessionDate).toHaveBeenCalledWith(
      expect.anything(),
      "20260917",
    );
    expect(checkPlayers).toHaveBeenCalledOnce();
    expect(submitSession).toHaveBeenCalledOnce();

    expect(result).toMatchObject({
      status: "sent",
      submission: { ok: true, sessionId: "EBU-999" },
    });
  });

  it("writes the check key back onto the session JSON before submitting", async () => {
    await uploadResultsToEbu(db, makeGame());
    const submitted = vi.mocked(submitSession).mock.calls[0][1] as {
      player: { check?: string };
    };
    expect(submitted.player.check).toBe("KEY1");
  });

  it("surfaces a duplicate-date advisory but still submits", async () => {
    vi.mocked(checkSessionDate).mockResolvedValue({
      sims: [],
      duplicates: 2,
    });
    const result = await uploadResultsToEbu(db, makeGame());
    expect(result.status).toBe("sent");
    if (result.status === "sent") {
      expect(result.advisories.join(" ")).toMatch(/already has 2/);
    }
    expect(submitSession).toHaveBeenCalledOnce();
  });

  it("does not fail the upload when the advisory date check throws", async () => {
    vi.mocked(checkSessionDate).mockRejectedValue(new Error("offline"));
    const result = await uploadResultsToEbu(db, makeGame());
    expect(result.status).toBe("sent");
    expect(submitSession).toHaveBeenCalledOnce();
  });

  it("passes through an EBU logical rejection as submission.ok=false", async () => {
    vi.mocked(submitSession).mockResolvedValue({
      ok: false,
      failure: "Rejected",
      warnings: [],
    });
    const result = await uploadResultsToEbu(db, makeGame());
    expect(result).toMatchObject({
      status: "sent",
      submission: { ok: false, failure: "Rejected" },
    });
  });
});
