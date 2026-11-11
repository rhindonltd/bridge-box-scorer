// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import type { BoardOutcome } from "@/model/score";
import { withFixtureMatchId, seedFixtureMatch } from "@/mocks/fixtures/db-rows";

/**
 * Integration coverage for setSubstitutionOptions: it writes `split` to BOTH of
 * a handover seat's occupancies and sets each occupant's `standing` from the
 * per-occupant eligibility, in one transaction, touching only the named seat.
 */
let tmpDir: string;
let gameId: string;

describe("setSubstitutionOptions", () => {
  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "set-subs-"));
    process.env.DATABASE_GAMES_URL = tmpDir;
    gameId = `game-${Math.random().toString(16).slice(2)}`;
    vi.resetModules();
  });

  afterEach(() => {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // best-effort cleanup
    }
    vi.resetModules();
  });

  async function setup() {
    const games = await import("@/db/games");
    const create = await import("@/db/games/actions/create-game");
    await create.createGameDb(gameId);
    const db = await games.getDb(gameId);
    if (!db) throw new Error("db not created");
    seedFixtureMatch(db);
    return db;
  }

  async function occupanciesForSeat(db: any) {
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const { eq } = await import("drizzle-orm");
    return db
      .select()
      .from(seatOccupancy)
      .where(eq(seatOccupancy.seat, "A1NS"))
      .all();
  }

  /**
   * Seat an earlier pair, lay boards 1–2, hand over → two ACTIVE occupancies on
   * A1NS: the earlier pair (boards 1–2, NOT the anchor) and the arriving pair
   * (boards 3–4, the arrival anchor).
   */
  async function handedOverSeat(db: any) {
    const { players } = await import("@/db/games/tables/players");
    const { seatOccupancy } = await import("@/db/games/tables/seat-occupancy");
    const p1 = db
      .insert(players)
      .values({ firstName: "Early", lastName: "One" })
      .returning()
      .get();
    const p2 = db
      .insert(players)
      .values({ firstName: "Early", lastName: "Two" })
      .returning()
      .get();
    db.insert(seatOccupancy)
      .values({
        seat: "A1NS",
        boards: null,
        player1: p1.id,
        player2: p2.id,
        secretKey: "early-secret",
      })
      .run();

    const { boards } = await import("@/db/games/tables/boards");
    const rows = [1, 2, 3, 4].map((boardNumber) => ({
      section: "A",
      roundNumber: boardNumber,
      tableNumber: 1,
      boardNumber,
      ns: "A1NS",
      ew: "A1EW",
      confirmedResult: boardNumber <= 2 ? ("3NTN=" as BoardOutcome) : null,
      status: boardNumber <= 2 ? ("CONFIRMED" as const) : null,
    }));
    db.insert(boards).values(rows.map(withFixtureMatchId)).run();

    const { handoverSeat } = await import("@/db/games/actions/handover-seat");
    await handoverSeat(gameId, {
      seat: "A1NS",
      realPair: {
        player1: { firstName: "Late", lastName: "One" },
        player2: { firstName: "Late", lastName: "Two" },
      },
      secretKey: "late-secret",
    });
  }

  it("writes split=1 to both occupancies and leaves both eligible when both ACTIVE", async () => {
    const db = await setup();
    await handedOverSeat(db);

    const before = await occupanciesForSeat(db);
    const { setSubstitutionOptions } = await import("./set-substitution-options");
    const ok = await setSubstitutionOptions(gameId, "A1NS", {
      split: true,
      eligibility: before.map((o: any) => ({ id: o.id, eligible: true })),
    });
    expect(ok).toBe(true);

    const occ = await occupanciesForSeat(db);
    expect(occ).toHaveLength(2);
    // split written to EVERY occupancy of the seat.
    expect(occ.every((o: any) => o.split === 1)).toBe(true);
    // both still ACTIVE (eligible).
    expect(occ.every((o: any) => o.standing === "ACTIVE")).toBe(true);
  });

  it("marks only the named occupant WITHOUT_STANDING, leaving the other ACTIVE", async () => {
    const db = await setup();
    await handedOverSeat(db);

    const before = await occupanciesForSeat(db);
    const earlier = before.find((o: any) => o.isArrivalAnchor === 0)!;
    const anchor = before.find((o: any) => o.isArrivalAnchor === 1)!;

    const { setSubstitutionOptions } = await import("./set-substitution-options");
    await setSubstitutionOptions(gameId, "A1NS", {
      split: false,
      eligibility: [
        { id: earlier.id, eligible: false },
        { id: anchor.id, eligible: true },
      ],
    });

    const occ = await occupanciesForSeat(db);
    const earlierAfter = occ.find((o: any) => o.id === earlier.id)!;
    const anchorAfter = occ.find((o: any) => o.id === anchor.id)!;
    expect(earlierAfter.standing).toBe("WITHOUT_STANDING");
    expect(anchorAfter.standing).toBe("ACTIVE");
    // split=false → 0 on both.
    expect(occ.every((o: any) => o.split === 0)).toBe(true);
  });

  it("toggling an occupant back to eligible restores ACTIVE", async () => {
    const db = await setup();
    await handedOverSeat(db);

    const before = await occupanciesForSeat(db);
    const earlier = before.find((o: any) => o.isArrivalAnchor === 0)!;
    const anchor = before.find((o: any) => o.isArrivalAnchor === 1)!;

    const { setSubstitutionOptions } = await import("./set-substitution-options");
    await setSubstitutionOptions(gameId, "A1NS", {
      split: true,
      eligibility: [
        { id: earlier.id, eligible: false },
        { id: anchor.id, eligible: true },
      ],
    });
    await setSubstitutionOptions(gameId, "A1NS", {
      split: true,
      eligibility: [
        { id: earlier.id, eligible: true },
        { id: anchor.id, eligible: true },
      ],
    });

    const occ = await occupanciesForSeat(db);
    expect(occ.every((o: any) => o.standing === "ACTIVE")).toBe(true);
  });

  it("ignores an id that does not belong to the seat", async () => {
    const db = await setup();
    await handedOverSeat(db);

    const before = await occupanciesForSeat(db);
    const anchor = before.find((o: any) => o.isArrivalAnchor === 1)!;

    const { setSubstitutionOptions } = await import("./set-substitution-options");
    await setSubstitutionOptions(gameId, "A1NS", {
      split: false,
      eligibility: [
        { id: anchor.id, eligible: true },
        // A stray id that is not one of this seat's occupancies.
        { id: 999999, eligible: false },
      ],
    });

    const occ = await occupanciesForSeat(db);
    // Nothing was wrongly marked without standing by the stray id.
    expect(occ.every((o: any) => o.standing === "ACTIVE")).toBe(true);
  });

  it("sets isMainLine on the chosen occupant and clears it on the other (merged seat)", async () => {
    const db = await setup();
    await handedOverSeat(db);

    const before = await occupanciesForSeat(db);
    const earlier = before.find((o: any) => o.isArrivalAnchor === 0)!;
    const anchor = before.find((o: any) => o.isArrivalAnchor === 1)!;

    const { setSubstitutionOptions } = await import("./set-substitution-options");
    await setSubstitutionOptions(gameId, "A1NS", {
      split: false,
      eligibility: [
        { id: anchor.id, eligible: true },
        { id: earlier.id, eligible: true },
      ],
      // Make the EARLIER pair the main pair (not the default anchor).
      mainOccupancyId: earlier.id,
    });

    const occ = await occupanciesForSeat(db);
    const earlierAfter = occ.find((o: any) => o.id === earlier.id)!;
    const anchorAfter = occ.find((o: any) => o.id === anchor.id)!;
    expect(earlierAfter.isMainLine).toBe(1);
    expect(anchorAfter.isMainLine).toBe(0);
    // Device identity (isArrivalAnchor) is untouched by the main-pair choice.
    expect(anchorAfter.isArrivalAnchor).toBe(1);
    expect(earlierAfter.isArrivalAnchor).toBe(0);
  });

  it("clears isMainLine on both occupants when the seat is split", async () => {
    const db = await setup();
    await handedOverSeat(db);

    const before = await occupanciesForSeat(db);
    const earlier = before.find((o: any) => o.isArrivalAnchor === 0)!;
    const anchor = before.find((o: any) => o.isArrivalAnchor === 1)!;

    const { setSubstitutionOptions } = await import("./set-substitution-options");
    // First make the earlier pair main while merged.
    await setSubstitutionOptions(gameId, "A1NS", {
      split: false,
      eligibility: [
        { id: anchor.id, eligible: true },
        { id: earlier.id, eligible: true },
      ],
      mainOccupancyId: earlier.id,
    });
    // Now split — the main-pair flag has no meaning and is cleared on both.
    await setSubstitutionOptions(gameId, "A1NS", {
      split: true,
      eligibility: [
        { id: anchor.id, eligible: true },
        { id: earlier.id, eligible: true },
      ],
      mainOccupancyId: earlier.id,
    });

    const occ = await occupanciesForSeat(db);
    expect(occ.every((o: any) => o.isMainLine === 0)).toBe(true);
  });

  it("returns false when the game has no database", async () => {
    await setup();
    const { setSubstitutionOptions } = await import("./set-substitution-options");
    expect(
      await setSubstitutionOptions("no-such-game", "A1NS", {
        split: false,
        eligibility: [],
      }),
    ).toBe(false);
  });
  it("returns false when no pair is seated there", async () => {
    await setup();
    const { setSubstitutionOptions } = await import("./set-substitution-options");
    expect(
      await setSubstitutionOptions(gameId, "A1NS", {
        split: false,
        eligibility: [],
      }),
    ).toBe(false);
  });
});
