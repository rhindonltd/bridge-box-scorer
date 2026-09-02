import { describe, it, expect } from "vitest";
import { Rooms } from "./rooms";

describe("Rooms", () => {
  describe("game", () => {
    it("returns game room name", () => {
      expect(Rooms.game("abc123")).toBe("game:abc123");
    });

    it("handles empty string", () => {
      expect(Rooms.game("")).toBe("game:");
    });
  });

  describe("table", () => {
    it("returns table room name scoped to game", () => {
      expect(Rooms.table("abc123", "table-1")).toBe(
        "game:abc123:table:table-1",
      );
    });

    it("handles numeric table ids", () => {
      expect(Rooms.table("game1", "5")).toBe("game:game1:table:5");
    });
  });

  describe("section", () => {
    it("returns section room name scoped to game", () => {
      expect(Rooms.section("abc123", "A")).toBe("game:abc123:section:A");
    });

    it("distinguishes sections within the same game", () => {
      expect(Rooms.section("g1", "A")).not.toBe(Rooms.section("g1", "B"));
    });
  });
});
