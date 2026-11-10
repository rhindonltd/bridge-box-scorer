import { describe, it, expect } from "vitest";
import { getTableConfig } from "drizzle-orm/sqlite-core";
import { boards } from "./boards";
import { matches } from "./matches";
describe("boards table", () => {
  it("references the owning match through match_id", () => {
    const [fk] = getTableConfig(boards).foreignKeys;
    const ref = fk.reference();
    expect(ref.columns.map((c) => c.name)).toEqual(["match_id"]);
    expect(ref.foreignTable).toBe(matches);
    expect(ref.foreignColumns.map((c) => c.name)).toEqual(["id"]);
  });
});
