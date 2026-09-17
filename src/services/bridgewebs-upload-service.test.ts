import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/db/system/queries/find-club", () => ({ findClub: vi.fn() }));
vi.mock("@/db/system/queries/bridgewebs-credentials", () => ({
  getBridgewebsCredentials: vi.fn(),
}));
vi.mock("@/services/usebio-service", () => ({ generateUsebio: vi.fn() }));
vi.mock("@/services/pbn-service", () => ({ generatePbnExport: vi.fn() }));
vi.mock("@/lib/bridgewebs/client", () => ({ postToBridgewebs: vi.fn() }));

import { findClub } from "@/db/system/queries/find-club";
import { getBridgewebsCredentials } from "@/db/system/queries/bridgewebs-credentials";
import { generateUsebio } from "@/services/usebio-service";
import { generatePbnExport } from "@/services/pbn-service";
import { postToBridgewebs } from "@/lib/bridgewebs/client";
import { uploadResultsToBridgewebs } from "@/services/bridgewebs-upload-service";
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
    sessionName: "",
    sectionName: "",
    eventDate: "2026-09-17T00:00:00.000Z",
    tables: 5,
    selectedMovement: null,
    leadCardRequired: true,
    bridgewebsEventId: null,
    createdAt: "",
    updatedAt: "",
    ...overrides,
  } as BridgeGame;
}

describe("uploadResultsToBridgewebs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(findClub).mockResolvedValue({
      id: 1,
      name: "Test BC",
      clubNumber: "123",
    });
    vi.mocked(getBridgewebsCredentials).mockResolvedValue({
      club: "myclub",
      password: "secret",
    });
    vi.mocked(generateUsebio).mockResolvedValue("<USEBIO/>");
    vi.mocked(generatePbnExport).mockResolvedValue("[Event]");
    vi.mocked(postToBridgewebs).mockResolvedValue({
      ok: true,
      message: "Upload Successful",
      json: null,
      raw: "message = Upload Successful",
    });
  });

  it("blocks when club info is not configured", async () => {
    vi.mocked(findClub).mockResolvedValue(null);
    const result = await uploadResultsToBridgewebs(db, makeGame());
    expect(result).toEqual({ status: "blocked", reason: "club" });
    expect(postToBridgewebs).not.toHaveBeenCalled();
  });

  it("blocks when BridgeWebs credentials are not configured", async () => {
    vi.mocked(getBridgewebsCredentials).mockResolvedValue(null);
    const result = await uploadResultsToBridgewebs(db, makeGame());
    expect(result).toEqual({ status: "blocked", reason: "credentials" });
    expect(postToBridgewebs).not.toHaveBeenCalled();
  });

  it("uploads USEBIO as data and PBN as dealdata, and passes the reply through", async () => {
    const result = await uploadResultsToBridgewebs(db, makeGame());

    expect(result).toEqual({
      status: "sent",
      reply: expect.objectContaining({ ok: true, message: "Upload Successful" }),
    });

    const [club, fields] = vi.mocked(postToBridgewebs).mock.calls[0];
    expect(club).toBe("myclub");
    expect(fields).toMatchObject({
      club: "myclub",
      password: "secret",
      type: "upload",
      data: "<USEBIO/>",
      dealdata: "[Event]",
    });
    // Filenames are sanitized from the event name + date (no unsafe chars).
    expect(fields.filename).toBe("Monday_Pairs__2026-09-17.xml");
    expect(fields.dealname).toBe("Monday_Pairs__2026-09-17.pbn");
    // No event mapping -> no event_id field.
    expect(fields.event_id).toBeUndefined();
  });

  it("includes event_id when the game is mapped to a BridgeWebs event", async () => {
    await uploadResultsToBridgewebs(db, makeGame({ bridgewebsEventId: "3" }));
    const [, fields] = vi.mocked(postToBridgewebs).mock.calls[0];
    expect(fields.event_id).toBe("3");
  });

  it("returns a failed reply as sent (BridgeWebs signals status in the body)", async () => {
    vi.mocked(postToBridgewebs).mockResolvedValue({
      ok: false,
      message: "Invalid password",
      json: null,
      raw: "message = Invalid password",
    });
    const result = await uploadResultsToBridgewebs(db, makeGame());
    expect(result).toEqual({
      status: "sent",
      reply: expect.objectContaining({ ok: false, message: "Invalid password" }),
    });
  });
});
