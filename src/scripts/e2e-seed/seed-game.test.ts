import { describe, it, expect } from "vitest";
import { isHeldBack, pickOutcome, scenarioToArgv } from "./seed-game";
import { parseCliArgs } from "@/scripts/seed-e2e-fixture";

describe("scenarioToArgv", () => {
  it("is empty for no scenario", () => {
    expect(scenarioToArgv()).toEqual([]);
    expect(scenarioToArgv({})).toEqual([]);
  });

  it("turns every typed step into the CLI flags the shared parser reads", () => {
    expect(
      scenarioToArgv({
        sections: 2,
        prestart: true,
        empty: ["A3EW"],
        expectedLate: ["A3NS", "B1NS"],
        lateArrive: ["A3NS"],
        withdraw: ["A1NS@3"],
        handover: ["A2NS"],
        treatment: { A1NS: "REMOVED" },
      }),
    ).toEqual([
      "--sections",
      "2",
      "--prestart",
      "--empty",
      "A3EW",
      "--expectedLate",
      "A3NS,B1NS",
      "--lateArrive",
      "A3NS",
      "--withdraw",
      "A1NS@3",
      "--handover",
      "A2NS",
      "--treatment",
      "A1NS=REMOVED",
    ]);
  });

  it("omits empty lists", () => {
    expect(scenarioToArgv({ withdraw: [], handover: ["A2NS"] })).toEqual([
      "--handover",
      "A2NS",
    ]);
  });
});

describe("parseCliArgs", () => {
  const parse = (flags: string) =>
    parseCliArgs(flags.split(" ").filter(Boolean));

  it("keeps the manual-testing defaults", () => {
    const o = parse("");
    expect(o.scoring).toBe("MP");
    expect(o.play).toBe("partial");
    expect(o.movement).toBe("fixture");
    expect(o.json).toBe(false);
    expect(o.tokens).toBe(false);
    expect(o.leadCardRequired).toBeUndefined();
  });

  it("reads sizes, options and output mode", () => {
    const o = parse(
      "--scoring XIMP --tables 5 --rounds 4 --boards 2 --play none --movement recommended --eventName Club --noLead --handEntry --tokens --json",
    );
    expect(o).toMatchObject({
      scoring: "XIMP",
      tables: 5,
      rounds: 4,
      boardsPerRound: 2,
      play: "none",
      movement: "recommended",
      eventName: "Club",
      leadCardRequired: false,
      handEntry: true,
      tokens: true,
      json: true,
    });
  });

  it("collects the scenario flags", () => {
    const o = parse(
      "--sections 2 --expectedLate A3EW,B1NS --withdraw A1NS@2 --handover A2NS --treatment A1NS=removed --prestart",
    );
    expect(o.scenario).toMatchObject({
      sections: 2,
      prestart: true,
      expectedLate: ["A3EW", "B1NS"],
      withdraw: ["A1NS@2"],
      handover: ["A2NS"],
      treatment: { A1NS: "REMOVED" },
    });
  });

  it("rejects unknown values", () => {
    expect(() => parse("--scoring NOPE")).toThrow(/Unknown --scoring/);
    expect(() => parse("--play some")).toThrow(/--play must be/);
    expect(() => parse("--movement best")).toThrow(/--movement must be/);
  });
});

describe("pickOutcome", () => {
  const play = { board: 7, table: 2, round: 3 };

  it("is undefined when no outcomes are given or none match", () => {
    expect(pickOutcome(undefined, play)).toBeUndefined();
    expect(pickOutcome({}, play)).toBeUndefined();
    expect(pickOutcome({ "8": "3NTN=", "7@1": "4SN+1" }, play)).toBeUndefined();
  });

  it("matches a board at every table, or at one table, or one exact play", () => {
    expect(pickOutcome({ "7": "3NTN=" }, play)).toBe("3NTN=");
    expect(pickOutcome({ "7@2": "4SN+1" }, play)).toBe("4SN+1");
    expect(pickOutcome({ "7@2/3": "4HS=" }, play)).toBe("4HS=");
    // The round must match for the most specific form.
    expect(pickOutcome({ "7@2/1": "4HS=" }, play)).toBeUndefined();
  });

  it("prefers the most specific key", () => {
    const outcomes = { "7": "3NTN=", "7@2": "4SN+1", "7@2/3": "4HS=" };
    expect(pickOutcome(outcomes, play)).toBe("4HS=");
    expect(pickOutcome(outcomes, { ...play, round: 1 })).toBe("4SN+1");
    expect(pickOutcome(outcomes, { ...play, table: 3 })).toBe("3NTN=");
  });
});

describe("isHeldBack", () => {
  const play = { board: 1, table: 2, round: 3 };

  it("holds nothing back by default", () => {
    expect(isHeldBack(undefined, play)).toBe(false);
    expect(isHeldBack([], play)).toBe(false);
  });

  it("matches a board at a table, or one exact play", () => {
    expect(isHeldBack(["1@2"], play)).toBe(true);
    expect(isHeldBack(["1@2/3"], play)).toBe(true);
    expect(isHeldBack(["1@2/1"], play)).toBe(false);
    expect(isHeldBack(["1@3", "2@2"], play)).toBe(false);
  });
});
