import { describe, it, expect } from "vitest";
import {
  EVENT_TYPE_MAP,
  eventTypeChoiceOf,
  isPairsChoice,
  scoringTypeFor,
  splitScoring,
} from "./event-type-choice";

describe("event-type-choice", () => {
  describe("EVENT_TYPE_MAP + eventTypeChoiceOf round-trip", () => {
    it("maps each choice to a gameType/eventFormat pair and back", () => {
      for (const choice of [
        "PAIRS",
        "TEAMS",
        "SWISS_PAIRS",
        "SWISS_TEAMS",
      ] as const) {
        const { gameType, eventFormat } = EVENT_TYPE_MAP[choice];
        expect(eventTypeChoiceOf(gameType, eventFormat)).toBe(choice);
      }
    });
  });

  describe("isPairsChoice", () => {
    it("is true for the pairs family", () => {
      expect(isPairsChoice("PAIRS")).toBe(true);
      expect(isPairsChoice("SWISS_PAIRS")).toBe(true);
    });
    it("is false for the teams family", () => {
      expect(isPairsChoice("TEAMS")).toBe(false);
      expect(isPairsChoice("SWISS_TEAMS")).toBe(false);
    });
  });

  describe("scoringTypeFor", () => {
    it("uses the pairs scoring for a pairs choice", () => {
      expect(scoringTypeFor("PAIRS", "XIMP", "IMP_VP")).toBe("XIMP");
      expect(scoringTypeFor("SWISS_PAIRS", "MP", "IMP_VP")).toBe("MP");
    });
    it("uses the teams scoring for a plain teams choice", () => {
      expect(scoringTypeFor("TEAMS", "MP", "BAM")).toBe("BAM");
    });
    it("forces IMP (VP) for Swiss Teams regardless of the teams choice", () => {
      expect(scoringTypeFor("SWISS_TEAMS", "MP", "BAM")).toBe("IMP_VP");
    });
  });

  describe("splitScoring", () => {
    it("keeps a pairs scoring and defaults teams to IMP", () => {
      expect(splitScoring("XIMP")).toEqual({
        pairsScoring: "XIMP",
        teamsScoring: "IMP",
      });
    });
    it("keeps a teams scoring and defaults pairs to MP", () => {
      expect(splitScoring("BAM")).toEqual({
        pairsScoring: "MP",
        teamsScoring: "BAM",
      });
      expect(splitScoring("IMP_VP")).toEqual({
        pairsScoring: "MP",
        teamsScoring: "IMP_VP",
      });
    });
    it("defaults both when the stored type is MP (the shared default)", () => {
      expect(splitScoring("MP")).toEqual({
        pairsScoring: "MP",
        teamsScoring: "IMP",
      });
    });
  });
});
