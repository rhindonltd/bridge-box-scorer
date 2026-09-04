import { describe, it, expect } from "vitest";

import {
  makePlayer,
  makeParticipant,
  makeBoard,
  makeSubmission,
} from "./db-rows";

describe("db-rows fixtures", () => {
  describe("makePlayer", () => {
    it("returns sensible defaults", () => {
      expect(makePlayer()).toEqual({ firstName: "Alice", lastName: "Adams" });
    });

    it("applies overrides", () => {
      expect(makePlayer({ lastName: "Brown" })).toEqual({
        firstName: "Alice",
        lastName: "Brown",
      });
    });

    it("returns a fresh object each call", () => {
      expect(makePlayer()).not.toBe(makePlayer());
    });
  });

  describe("makeParticipant", () => {
    it("returns sensible defaults", () => {
      expect(makeParticipant()).toEqual({
        initialSeat: "A1NS",
        player1: 1,
        player2: 2,
        secretKey: "secret",
      });
    });

    it("applies overrides", () => {
      expect(makeParticipant({ initialSeat: "A2EW", player1: 3 })).toMatchObject(
        {
          initialSeat: "A2EW",
          player1: 3,
        },
      );
    });
  });

  describe("makeBoard", () => {
    it("returns sensible defaults", () => {
      expect(makeBoard()).toMatchObject({
        section: "A",
        roundNumber: 1,
        tableNumber: 1,
        boardNumber: 1,
        status: "NOT_PLAYED",
      });
    });

    it("applies overrides", () => {
      expect(makeBoard({ boardNumber: 7, status: "CONFIRMED" })).toMatchObject({
        boardNumber: 7,
        status: "CONFIRMED",
      });
    });
  });

  describe("makeSubmission", () => {
    it("returns sensible defaults", () => {
      expect(makeSubmission()).toMatchObject({
        section: "A",
        side: "NS",
        result: "3NTN=",
      });
    });

    it("applies overrides", () => {
      expect(makeSubmission({ side: "EW", result: "4HE=" })).toMatchObject({
        side: "EW",
        result: "4HE=",
      });
    });
  });
});
