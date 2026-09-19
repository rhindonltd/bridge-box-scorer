import { describe, it, expect } from "vitest";
import { findSeatedNationalIds } from "./find-seated-national-ids";
import type { Db } from "@/db/games";

/**
 * Stub a db whose `select().from().innerJoin().innerJoin()` resolves to `rows`
 * (each row = the two players' nationalId for one seated participant).
 */
function stubDb(rows: { id1: string | null; id2: string | null }[]): Db {
  const chain = {
    from: () => chain,
    innerJoin: () => chain,
    then: (resolve: (r: typeof rows) => void) => resolve(rows),
  };
  return { select: () => chain } as unknown as Db;
}

describe("findSeatedNationalIds", () => {
  it("collects both players' national ids across all seated participants", async () => {
    const db = stubDb([
      { id1: "111", id2: "222" },
      { id1: "333", id2: "444" },
    ]);

    const seated = await findSeatedNationalIds(db);
    expect(seated).toEqual(new Set(["111", "222", "333", "444"]));
  });

  it("excludes guests (null national id)", async () => {
    const db = stubDb([
      { id1: "111", id2: null },
      { id1: null, id2: null },
    ]);

    const seated = await findSeatedNationalIds(db);
    expect(seated).toEqual(new Set(["111"]));
  });

  it("de-duplicates a national id seated more than once", async () => {
    const db = stubDb([
      { id1: "111", id2: "222" },
      { id1: "111", id2: "333" },
    ]);

    const seated = await findSeatedNationalIds(db);
    expect(seated).toEqual(new Set(["111", "222", "333"]));
  });

  it("returns an empty set when no one is seated", async () => {
    const seated = await findSeatedNationalIds(stubDb([]));
    expect(seated.size).toBe(0);
  });
});
