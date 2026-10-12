import { describe, it, expect } from "vitest";
import { TournamentLevels } from "@/db/games/types/tournament-level";
import {
  TOURNAMENT_LEVEL_INFO,
  TOURNAMENT_LEVEL_OPTIONS,
  DEFAULT_TOURNAMENT_LEVEL,
  masterPointFieldsFor,
} from "@/model/tournament-level";

describe("TOURNAMENT_LEVEL_INFO", () => {
  it("maps each EBU level to its documented USEBIO fields", () => {
    expect(TOURNAMENT_LEVEL_INFO.NORMAL_CLUB).toMatchObject({
      masterPointScale: "Club",
      masterPointType: "BLACK",
      p2pChargeRate: "10",
    });
    expect(TOURNAMENT_LEVEL_INFO.NO_POINTS_CLUB.p2pChargeRate).toBe("11");
    expect(TOURNAMENT_LEVEL_INFO.POINTS_ONLY_CLUB.p2pChargeRate).toBe("12");
    expect(TOURNAMENT_LEVEL_INFO.DISTRICT_LEAGUE).toMatchObject({
      masterPointScale: "District",
      masterPointType: "BLACK",
      p2pChargeRate: "21",
    });
    expect(TOURNAMENT_LEVEL_INFO.COUNTY_BLACK).toMatchObject({
      masterPointScale: "County",
      masterPointType: "BLACK",
      p2pChargeRate: "20",
    });
    expect(TOURNAMENT_LEVEL_INFO.COUNTY_BLUE).toMatchObject({
      masterPointScale: "County",
      masterPointType: "BLUE",
      p2pChargeRate: "20",
    });
    expect(TOURNAMENT_LEVEL_INFO.MAJOR_COUNTY).toMatchObject({
      masterPointScale: "County",
      masterPointType: "GREEN",
      p2pChargeRate: "20",
    });
    expect(TOURNAMENT_LEVEL_INFO.NATIONAL_HEAT).toMatchObject({
      masterPointScale: "National",
      masterPointType: "GREEN",
      p2pChargeRate: "30",
    });
  });

  it("has an entry for every declared level", () => {
    for (const level of TournamentLevels) {
      expect(TOURNAMENT_LEVEL_INFO[level]).toBeDefined();
      expect(TOURNAMENT_LEVEL_INFO[level].label.length).toBeGreaterThan(0);
    }
  });
});

describe("masterPointFieldsFor", () => {
  it("resolves a known level to its three fields", () => {
    expect(masterPointFieldsFor("NATIONAL_HEAT")).toEqual({
      masterPointScale: "National",
      masterPointType: "GREEN",
      p2pChargeRate: "30",
    });
  });

  it("falls back to the default level for null/undefined", () => {
    const expected = masterPointFieldsFor(DEFAULT_TOURNAMENT_LEVEL);
    expect(masterPointFieldsFor(null)).toEqual(expected);
    expect(masterPointFieldsFor(undefined)).toEqual(expected);
    expect(expected.masterPointScale).toBe("Club");
    expect(expected.p2pChargeRate).toBe("10");
  });
});

describe("TOURNAMENT_LEVEL_OPTIONS", () => {
  it("lists every level in declaration order, Normal Club first", () => {
    expect(TOURNAMENT_LEVEL_OPTIONS.map((o) => o.value)).toEqual([
      ...TournamentLevels,
    ]);
    expect(TOURNAMENT_LEVEL_OPTIONS[0]).toEqual({
      label: "Normal Club",
      value: "NORMAL_CLUB",
    });
  });
});
