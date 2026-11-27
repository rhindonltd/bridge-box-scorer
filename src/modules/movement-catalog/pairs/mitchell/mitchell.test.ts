import { describe, expect, it } from "vitest";
import { generateMitchell } from "./mitchell";
import { generateStandardMitchell } from "./standard-mitchell";
import { generateSkipMitchell } from "./skip-mitchell";
import { generateShareAndRelayMitchell } from "./share-and-relay-mitchell";
import { generateBlackpool } from "./blackpool";
import { generateHesitationMitchell } from "./hesitation-mitchell";
import { generateDoubleHesitationMitchell } from "./double-hesitation-mitchell";

describe("generateMitchell dispatch", () => {
  it("produces a Standard Mitchell when no flag is set", () => {
    const spec = { tables: 5, rounds: 5, boardsPerRound: 3 };
    expect(generateMitchell(spec)).toEqual(generateStandardMitchell(spec));
  });

  it("dispatches to Skip Mitchell", () => {
    const spec = { tables: 6, rounds: 5, boardsPerRound: 3, skip: true };
    expect(generateMitchell(spec)).toEqual(
      generateSkipMitchell({ ...spec, skip: true }),
    );
  });

  it("dispatches to Share and Relay Mitchell", () => {
    const spec = {
      tables: 6,
      rounds: 6,
      boardsPerRound: 4,
      shareAndRelay: true,
    };
    expect(generateMitchell(spec)).toEqual(
      generateShareAndRelayMitchell({ ...spec, shareAndRelay: true }),
    );
  });

  it("dispatches to Blackpool", () => {
    const spec = {
      tables: 12,
      rounds: 12,
      boardsPerRound: 2,
      blackpool: true,
    };
    expect(generateMitchell(spec)).toEqual(
      generateBlackpool({ ...spec, blackpool: true }),
    );
  });

  it("dispatches to Hesitation Mitchell", () => {
    const spec = {
      tables: 7,
      rounds: 8,
      boardsPerRound: 3,
      hesitation: true,
    };
    expect(generateMitchell(spec)).toEqual(
      generateHesitationMitchell({ ...spec, hesitation: true }),
    );
  });

  it("dispatches to Double Hesitation Mitchell", () => {
    const spec = {
      tables: 6,
      rounds: 8,
      boardsPerRound: 3,
      doubleHesitation: true,
    };
    expect(generateMitchell(spec)).toEqual(
      generateDoubleHesitationMitchell({ ...spec, doubleHesitation: true }),
    );
  });

  it("passes the modified flag through to Double Hesitation", () => {
    const spec = {
      tables: 6,
      rounds: 8,
      boardsPerRound: 3,
      doubleHesitation: true,
      modified: true,
    };
    expect(generateMitchell(spec)).toEqual(
      generateDoubleHesitationMitchell({
        ...spec,
        doubleHesitation: true,
      }),
    );
  });

  it("passes revengeRounds through to Blackpool", () => {
    const spec = {
      tables: 6,
      rounds: 6,
      boardsPerRound: 2,
      blackpool: true,
      revengeRounds: 1,
    };
    const result = generateMitchell(spec);
    // Blackpool with one revenge round plays T+1 rounds.
    for (const table of result.tables) {
      expect(table.rounds).toHaveLength(7);
    }
  });

  it("prefers skip over other flags when multiple are set", () => {
    // Defensive: at most one flag should be set, but dispatch order is fixed.
    const spec = {
      tables: 6,
      rounds: 5,
      boardsPerRound: 3,
      skip: true,
      blackpool: true,
    };
    expect(generateMitchell(spec)).toEqual(
      generateSkipMitchell({ ...spec, skip: true }),
    );
  });
});
