import { describe, it, expect } from "vitest";
import { generateMitchell } from "@/movement/mitchell";
import { validateMitchell } from "@/movement/validateMitchell";

describe("Mitchell Movement Generator", () => {
  // ---------------------------
  // Standard Mitchell Movements
  // ---------------------------
  it("generates a basic Mitchell for odd tables (no share & relay)", () => {
    const tables = 7;
    const rounds = 7;
    const boardsPerRound = 2;

    const movement = generateMitchell({ tables, rounds, boardsPerRound });
    expect(() =>
      validateMitchell(movement, { tables, rounds, boardsPerRound }),
    ).not.toThrow();
  });

  it("generates a basic Mitchell for even tables with share & relay", () => {
    const tables = 8;
    const rounds = 8;
    const boardsPerRound = 2;

    const movement = generateMitchell({ tables, rounds, boardsPerRound });
    expect(() =>
      validateMitchell(movement, { tables, rounds, boardsPerRound }),
    ).not.toThrow();
  });

  // ---------------------------
  // Skip Mitchell
  // ---------------------------
  it("generates a skip Mitchell for even tables", () => {
    const tables = 6;
    const rounds = 6;
    const boardsPerRound = 3;

    const movement = generateMitchell({
      tables,
      rounds,
      boardsPerRound,
      skip: true,
    });
    expect(() =>
      validateMitchell(movement, {
        tables,
        rounds,
        boardsPerRound,
        skip: true,
      }),
    ).not.toThrow();
  });

  it("throws error if skip Mitchell is requested for odd tables", () => {
    const tables = 5;
    const rounds = 5;
    const boardsPerRound = 3;

    expect(() =>
      generateMitchell({ tables, rounds, boardsPerRound, skip: true }),
    ).toThrow();
  });

  // ---------------------------
  // Arrow Switch Movements
  // ---------------------------
  it("generates an arrow-switched Mitchell for odd tables", () => {
    const tables = 7;
    const rounds = 7;
    const boardsPerRound = 3;
    const arrowSwitchRounds = 2;

    const movement = generateMitchell({
      tables,
      rounds,
      boardsPerRound,
      arrowSwitchRounds,
    });
    expect(() =>
      validateMitchell(movement, {
        tables,
        rounds,
        boardsPerRound,
        arrowSwitchRounds,
      }),
    ).not.toThrow();
  });

  it("generates an arrow-switched Mitchell for even tables with share & relay", () => {
    const tables = 8;
    const rounds = 8;
    const boardsPerRound = 3;
    const arrowSwitchRounds = 2;

    const movement = generateMitchell({
      tables,
      rounds,
      boardsPerRound,
      arrowSwitchRounds,
    });
    expect(() =>
      validateMitchell(movement, {
        tables,
        rounds,
        boardsPerRound,
        arrowSwitchRounds,
      }),
    ).not.toThrow();
  });

  // ---------------------------
  // Board Coverage & Fairness
  // ---------------------------
  it("ensures every board is played the correct number of times for share & relay", () => {
    const tables = 8;
    const rounds = 8;
    const boardsPerRound = 2;

    const movement = generateMitchell({ tables, rounds, boardsPerRound });
    expect(() =>
      validateMitchell(movement, { tables, rounds, boardsPerRound }),
    ).not.toThrow();
  });

  it("ensures no pair plays the same board twice in skip Mitchell", () => {
    const tables = 6;
    const rounds = 6;
    const boardsPerRound = 3;

    const movement = generateMitchell({
      tables,
      rounds,
      boardsPerRound,
      skip: true,
    });
    expect(() =>
      validateMitchell(movement, {
        tables,
        rounds,
        boardsPerRound,
        skip: true,
      }),
    ).not.toThrow();
  });

  // ---------------------------
  // Smallest and Largest Usable Tables
  // ---------------------------
  it("validates a small 3-table Mitchell", () => {
    const tables = 3;
    const rounds = 3;
    const boardsPerRound = 2;

    const movement = generateMitchell({ tables, rounds, boardsPerRound });
    expect(() =>
      validateMitchell(movement, { tables, rounds, boardsPerRound }),
    ).not.toThrow();
  });

  it("validates a large 12-table Mitchell with share & relay", () => {
    const tables = 12;
    const rounds = 12;
    const boardsPerRound = 3;

    const movement = generateMitchell({ tables, rounds, boardsPerRound });
    expect(() =>
      validateMitchell(movement, { tables, rounds, boardsPerRound }),
    ).not.toThrow();
  });

  // ---------------------------
  // Combined Features
  // ---------------------------
  it("generates Mitchell with skip and arrow switch together", () => {
    const tables = 6;
    const rounds = 6;
    const boardsPerRound = 3;
    const arrowSwitchRounds = 2;

    const movement = generateMitchell({
      tables,
      rounds,
      boardsPerRound,
      skip: true,
      arrowSwitchRounds,
    });
    expect(() =>
      validateMitchell(movement, {
        tables,
        rounds,
        boardsPerRound,
        skip: true,
        arrowSwitchRounds,
      }),
    ).not.toThrow();
  });
});
