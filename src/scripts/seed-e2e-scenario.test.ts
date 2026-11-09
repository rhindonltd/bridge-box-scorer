import { describe, it, expect } from "vitest";
import {
  parseScenarioArgs,
  seatsFor,
  sectionLetters,
  type ScenarioContext,
} from "./seed-e2e-scenario";

const ctx = (over: Partial<ScenarioContext> = {}): ScenarioContext => ({
  tables: 3,
  rounds: 3,
  play: "partial",
  boardPooledPairs: true,
  ...over,
});

const parse = (flags: string, over: Partial<ScenarioContext> = {}) =>
  parseScenarioArgs(flags.split(" ").filter(Boolean), ctx(over));

describe("seatsFor / sectionLetters", () => {
  it("lists both directions of every table in every section", () => {
    expect(seatsFor(2, 2)).toEqual([
      "A1NS",
      "A1EW",
      "A2NS",
      "A2EW",
      "B1NS",
      "B1EW",
      "B2NS",
      "B2EW",
    ]);
  });

  it("names sections A, B, C…", () => {
    expect(sectionLetters(3)).toEqual(["A", "B", "C"]);
  });
});

describe("parseScenarioArgs", () => {
  it("defaults to a single section with no scenario", () => {
    expect(parse("")).toEqual({
      sections: 1,
      prestart: false,
      empty: [],
      expectedLate: [],
      lateArrive: [],
      withdraw: [],
      handover: [],
      treatment: [],
      tokens: false,
    });
  });

  it("parses seats, rounds and treatments", () => {
    const s = parse(
      "--sections 2 --expectedLate A3EW,B1NS --withdraw A1NS@2,B2EW --handover A2NS --treatment A1NS=removed --tokens",
    );
    expect(s.sections).toBe(2);
    expect(s.expectedLate).toEqual(["A3EW", "B1NS"]);
    expect(s.withdraw).toEqual([
      { seat: "A1NS", fromRound: 2 },
      { seat: "B2EW" },
    ]);
    expect(s.handover).toEqual(["A2NS"]);
    expect(s.treatment).toEqual([{ seat: "A1NS", treatment: "REMOVED" }]);
    expect(s.tokens).toBe(true);
  });

  it("only supports board-pooled pairs fixtures", () => {
    expect(() => parse("--withdraw A1NS", { boardPooledPairs: false })).toThrow(
      /only supported for the board-pooled pairs fixtures/,
    );
    expect(() => parse("--sections 2", { boardPooledPairs: false })).toThrow(
      /only supported/,
    );
  });

  it("rejects a bad section count", () => {
    expect(() => parse("--sections 0")).toThrow(/from 1 to 3/);
    expect(() => parse("--sections 4")).toThrow(/from 1 to 3/);
    expect(() => parse("--sections two")).toThrow(/from 1 to 3/);
  });

  it("rejects malformed and out-of-range seats with a helpful message", () => {
    expect(() => parse("--withdraw A1")).toThrow(/is not a seat/);
    expect(() => parse("--withdraw B1NS")).toThrow(/only section A/);
    expect(() => parse("--withdraw A9NS")).toThrow(/3 tables/);
    expect(() => parse("--withdraw A0NS")).toThrow(/3 tables/);
  });

  it("rejects a duplicated seat", () => {
    expect(() => parse("--handover A1NS,A1NS")).toThrow(/listed twice/);
  });

  it("rejects a withdraw round outside the movement", () => {
    expect(() => parse("--withdraw A1NS@0")).toThrow(/1 to 3/);
    expect(() => parse("--withdraw A1NS@9")).toThrow(/1 to 3/);
    expect(() => parse("--withdraw A1NS@x")).toThrow(/1 to 3/);
  });

  it("requires --lateArrive seats to be expected-late", () => {
    expect(() => parse("--lateArrive A3EW")).toThrow(
      /must also be listed in --expectedLate/,
    );
  });

  it("can't withdraw or hand over an unseated expected-late seat", () => {
    expect(() => parse("--expectedLate A3EW --withdraw A3EW")).toThrow(
      /expected-late seat/,
    );
    expect(() => parse("--expectedLate A3EW --handover A3EW")).toThrow(
      /expected-late seat/,
    );
  });

  it("can't both withdraw and hand over the same seat", () => {
    expect(() => parse("--withdraw A1NS --handover A1NS")).toThrow(
      /both withdrawn and handed over/,
    );
  });

  it("leaves at least one pair seated", () => {
    expect(() => parse("--expectedLate A1NS,A1EW,A2NS,A2EW,A3NS,A3EW")).toThrow(
      /at least one pair must be seated/,
    );
    expect(() =>
      parse("--prestart --empty A1NS,A1EW,A2NS --expectedLate A2EW,A3NS,A3EW"),
    ).toThrow(/at least one pair must be seated/);
  });

  describe("--prestart / --empty", () => {
    it("parses an un-started field with unmarked empty seats", () => {
      const s = parse("--prestart --empty A3EW --expectedLate A3NS");
      expect(s.prestart).toBe(true);
      expect(s.empty).toEqual(["A3EW"]);
      expect(s.expectedLate).toEqual(["A3NS"]);
    });

    it("--prestart alone is allowed on any fixture", () => {
      expect(() =>
        parse("--prestart", { boardPooledPairs: false }),
      ).not.toThrow();
    });

    it("--empty needs --prestart", () => {
      expect(() => parse("--empty A3EW")).toThrow(
        /only makes sense with --prestart/,
      );
    });

    it("a seat can't be both --empty and --expectedLate", () => {
      expect(() =>
        parse("--prestart --empty A3EW --expectedLate A3EW"),
      ).toThrow(/both --empty and --expectedLate/);
    });

    it("can't combine --prestart with steps that need a started game", () => {
      expect(() => parse("--prestart --withdraw A1NS")).toThrow(
        /need a started game/,
      );
      expect(() => parse("--prestart --handover A1NS")).toThrow(
        /need a started game/,
      );
      expect(() =>
        parse("--prestart --expectedLate A3EW --lateArrive A3EW"),
      ).toThrow(/need a started game/);
    });
  });

  it("needs unplayed boards to withdraw or hand over", () => {
    expect(() => parse("--withdraw A1NS", { play: "all" })).toThrow(
      /--play all leaves none/,
    );
    expect(() => parse("--handover A1NS", { play: "all" })).toThrow(
      /--play all leaves none/,
    );
    expect(() => parse("--withdraw A1NS", { play: "round1" })).not.toThrow();
    expect(() => parse("--handover A1NS", { play: "none" })).not.toThrow();
  });

  describe("late arrival needs results beyond round 1", () => {
    const flags = "--expectedLate A3EW --lateArrive A3EW";

    it("is fine when every round is played", () => {
      expect(() => parse(flags, { play: "all", rounds: 2 })).not.toThrow();
    });

    it("is fine with --play partial and 3+ rounds", () => {
      expect(() => parse(flags, { play: "partial", rounds: 3 })).not.toThrow();
    });

    it("is rejected with --play partial and only 2 rounds (half = round 1)", () => {
      expect(() => parse(flags, { play: "partial", rounds: 2 })).toThrow(
        /round 2 or later/,
      );
    });

    it("is rejected with --play round1 or none", () => {
      expect(() => parse(flags, { play: "round1" })).toThrow(
        /round 2 or later/,
      );
      expect(() => parse(flags, { play: "none" })).toThrow(/round 2 or later/);
    });
  });

  it("rejects a treatment without a value or for a seat with no missed boards", () => {
    expect(() => parse("--withdraw A1NS --treatment A1NS")).toThrow(
      /needs a value/,
    );
    expect(() => parse("--withdraw A1NS --treatment A1NS=KEEP")).toThrow(
      /needs a value/,
    );
    expect(() => parse("--treatment A1NS=REMOVED")).toThrow(/no missed boards/);
  });

  it("accepts a treatment for an expected-late seat that is still empty", () => {
    expect(() =>
      parse("--expectedLate A3EW --treatment A3EW=REMOVED"),
    ).not.toThrow();
  });
});
