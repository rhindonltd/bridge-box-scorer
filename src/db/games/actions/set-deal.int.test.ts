// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { createDbHarness, type DbHarness } from "@/db/test/db-int-harness";
import type { Db } from "@/db/games";
import type { Deal } from "@/model/common";

/** A valid 52-card deal (N=spades, E=hearts, S=diamonds, W=clubs). */
function buildValidDeal(): Deal {
  const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  return {
    N: ranks.map((r) => `${r}S`),
    E: ranks.map((r) => `${r}H`),
    S: ranks.map((r) => `${r}D`),
    W: ranks.map((r) => `${r}C`),
  };
}

/** A second, different valid deal (rotate suits one direction). */
function buildOtherDeal(): Deal {
  const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  return {
    N: ranks.map((r) => `${r}H`),
    E: ranks.map((r) => `${r}D`),
    S: ranks.map((r) => `${r}C`),
    W: ranks.map((r) => `${r}S`),
  };
}

describe("deals query/action layer", () => {
  let harness: DbHarness;

  beforeEach(async () => {
    harness = createDbHarness("games");
    await harness.setup();
  });

  afterEach(() => {
    harness.teardown();
  });

  it("insertDealIfAbsent stores a deal once then reports it exists", async () => {
    const db = (await harness.getDb()) as Db;
    const { insertDealIfAbsent } = await import("@/db/games/actions/set-deal");
    const { getDealHands, getDealRow } = await import(
      "@/db/games/queries/get-deal"
    );

    const deal = buildValidDeal();
    const first = await insertDealIfAbsent(db, 1, deal);
    expect(first).toEqual({ status: "inserted" });

    // A second attempt (even with a different deal) does not overwrite.
    const second = await insertDealIfAbsent(db, 1, buildOtherDeal());
    expect(second).toEqual({ status: "exists" });

    // The stored deal is the first one, and round-trips through PBN.
    expect(await getDealHands(db, 1)).toEqual(deal);
    const row = await getDealRow(db, 1);
    expect(row?.source).toBe("PLAYER");
  });

  it("upsertDeal overwrites an existing deal", async () => {
    const db = (await harness.getDb()) as Db;
    const { insertDealIfAbsent, upsertDeal } = await import(
      "@/db/games/actions/set-deal"
    );
    const { getDealHands, getDealRow } = await import(
      "@/db/games/queries/get-deal"
    );

    await insertDealIfAbsent(db, 2, buildValidDeal());
    const replacement = buildOtherDeal();
    await upsertDeal(db, 2, replacement);

    expect(await getDealHands(db, 2)).toEqual(replacement);
    const row = await getDealRow(db, 2);
    expect(row?.source).toBe("DIRECTOR");
  });

  it("getDealHands returns null when no deal exists", async () => {
    const db = (await harness.getDb()) as Db;
    const { getDealHands } = await import("@/db/games/queries/get-deal");
    expect(await getDealHands(db, 99)).toBeNull();
  });

  it("getAllDealHands returns every stored deal keyed by board number", async () => {
    const db = (await harness.getDb()) as Db;
    const { insertDealIfAbsent } = await import("@/db/games/actions/set-deal");
    const { getAllDealHands } = await import("@/db/games/queries/get-deal");

    await insertDealIfAbsent(db, 1, buildValidDeal());
    await insertDealIfAbsent(db, 3, buildOtherDeal());

    const all = await getAllDealHands(db);
    expect([...all.keys()].sort((a, b) => a - b)).toEqual([1, 3]);
    expect(all.get(1)).toEqual(buildValidDeal());
    expect(all.get(3)).toEqual(buildOtherDeal());
  });

  it("rejects an incomplete deal before writing", async () => {
    const db = (await harness.getDb()) as Db;
    const { insertDealIfAbsent, upsertDeal } = await import(
      "@/db/games/actions/set-deal"
    );
    const { getDealHands } = await import("@/db/games/queries/get-deal");

    const broken = buildValidDeal();
    broken.N = broken.N.slice(0, 12); // only 12 cards

    await expect(insertDealIfAbsent(db, 4, broken)).rejects.toThrow();
    await expect(upsertDeal(db, 4, broken)).rejects.toThrow();
    expect(await getDealHands(db, 4)).toBeNull();
  });
});
