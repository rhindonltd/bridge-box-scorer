import { describe, it, expect, vi } from "vitest";
import { insertDealIfAbsent, upsertDeal } from "./set-deal";
import type { Card, Deal, Rank } from "@/model/common";

// A genuinely valid 52-card deal (each card once): N spades, E hearts,
// S diamonds, W clubs.
function buildValidDeal(): Deal {
  const ranks: Rank[] = [
    "A",
    "K",
    "Q",
    "J",
    "T",
    "9",
    "8",
    "7",
    "6",
    "5",
    "4",
    "3",
    "2",
  ];
  return {
    N: ranks.map((r): Card => `S${r}`),
    E: ranks.map((r): Card => `H${r}`),
    S: ranks.map((r): Card => `D${r}`),
    W: ranks.map((r): Card => `C${r}`),
  };
}

/** A db whose `insert().values().onConflictDoNothing()` resolves to `result`. */
function stubInsertIfAbsentDb(result: unknown) {
  const onConflictDoNothing = vi.fn(() => Promise.resolve(result));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  return { db: { insert } as never, values };
}

/** A db whose `insert().values().onConflictDoUpdate()` resolves. */
function stubUpsertDb() {
  const onConflictDoUpdate = vi.fn(() => Promise.resolve());
  const values = vi.fn(() => ({ onConflictDoUpdate }));
  const insert = vi.fn(() => ({ values }));
  return { db: { insert } as never, values, onConflictDoUpdate };
}

describe("insertDealIfAbsent", () => {
  it("throws on an incomplete deal without touching the db", async () => {
    const deal = buildValidDeal();
    deal.N = deal.N.slice(0, 12); // 12 cards
    const { db } = stubInsertIfAbsentDb({ changes: 1 });

    await expect(insertDealIfAbsent(db, 1, deal)).rejects.toThrow(
      /incomplete deal for board 1/,
    );
  });

  it("reports 'inserted' when a row was written (changes > 0)", async () => {
    const { db } = stubInsertIfAbsentDb({ changes: 1 });
    await expect(insertDealIfAbsent(db, 1, buildValidDeal())).resolves.toEqual({
      status: "inserted",
    });
  });

  it("reports 'exists' when no row was written (changes === 0)", async () => {
    const { db } = stubInsertIfAbsentDb({ changes: 0 });
    await expect(insertDealIfAbsent(db, 1, buildValidDeal())).resolves.toEqual({
      status: "exists",
    });
  });

  it("treats a missing `changes` field as no row written (?? 0 fallback)", async () => {
    const { db } = stubInsertIfAbsentDb({});
    await expect(insertDealIfAbsent(db, 1, buildValidDeal())).resolves.toEqual({
      status: "exists",
    });
  });
});

describe("upsertDeal", () => {
  it("throws on an incomplete deal without touching the db", async () => {
    const deal = buildValidDeal();
    deal.N = deal.N.slice(0, 12);
    const { db } = stubUpsertDb();

    await expect(upsertDeal(db, 2, deal)).rejects.toThrow(
      /incomplete deal for board 2/,
    );
  });

  it("writes the validated deal with the default DIRECTOR source", async () => {
    const { db, values } = stubUpsertDb();
    await upsertDeal(db, 2, buildValidDeal());
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ boardNumber: 2, source: "DIRECTOR" }),
    );
  });

  it("honours an explicit source", async () => {
    const { db, values } = stubUpsertDb();
    await upsertDeal(db, 3, buildValidDeal(), "PLAYER");
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ source: "PLAYER" }),
    );
  });
});
