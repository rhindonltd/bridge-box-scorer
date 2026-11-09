import { describe, it, expect } from "vitest";
import { scenarioToArgv } from "./seed-game";
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
  const parse = (flags: string) => parseCliArgs(flags.split(" ").filter(Boolean));

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
