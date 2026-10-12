import {
  TournamentLevel,
  TournamentLevels,
} from "@/db/games/types/tournament-level";

/**
 * The three USEBIO EVENT fields a tournament level resolves to. The EBU reads
 * these to decide charge rates, which Master Points to award, and whether the
 * session feeds the National Grading Scheme:
 * - `masterPointScale` → `<MASTER_POINT_SCALE>` (Club / District / County /
 *   National).
 * - `masterPointType`  → `<MASTER_POINT_TYPE>` (BLACK / BLUE / GREEN).
 * - `p2pChargeRate`    → `<P2P_CHARGE_RATE>` (the EBU's play-to-pay rate code).
 */
export type UsebioMasterPointFields = {
  masterPointScale: "Club" | "District" | "County" | "National";
  masterPointType: "BLACK" | "BLUE" | "GREEN";
  p2pChargeRate: string;
};

/** A tournament level's display label plus the USEBIO fields it resolves to. */
export type TournamentLevelInfo = UsebioMasterPointFields & {
  label: string;
};

/**
 * The authoritative mapping from each tournament level to its label and the
 * three USEBIO EVENT fields. Sourced from the EBU's level definitions:
 *
 *   Level                     SCALE      TYPE    P2P
 *   Normal Club (default)     Club       BLACK   10   standard weekly duplicate
 *   No-Points Club            Club       BLACK   11   social / training (no UMS)
 *   Points-Only Club          Club       BLACK   12   points but no NGS
 *   District League           District   BLACK   21   inter-club league / KO
 *   Standard County (Black)   County     BLACK   20   county league / single event
 *   Standard County (Blue)    County     BLUE    20   county league / single event
 *   Major County              County     GREEN   20   County Championship
 *   National Heat             National   GREEN   30   National heats / congresses
 */
export const TOURNAMENT_LEVEL_INFO: Record<
  TournamentLevel,
  TournamentLevelInfo
> = {
  NORMAL_CLUB: {
    label: "Normal Club",
    masterPointScale: "Club",
    masterPointType: "BLACK",
    p2pChargeRate: "10",
  },
  NO_POINTS_CLUB: {
    label: "No-Points Club",
    masterPointScale: "Club",
    masterPointType: "BLACK",
    p2pChargeRate: "11",
  },
  POINTS_ONLY_CLUB: {
    label: "Points-Only Club",
    masterPointScale: "Club",
    masterPointType: "BLACK",
    p2pChargeRate: "12",
  },
  DISTRICT_LEAGUE: {
    label: "District League",
    masterPointScale: "District",
    masterPointType: "BLACK",
    p2pChargeRate: "21",
  },
  COUNTY_BLACK: {
    label: "Standard County (Black)",
    masterPointScale: "County",
    masterPointType: "BLACK",
    p2pChargeRate: "20",
  },
  COUNTY_BLUE: {
    label: "Standard County (Blue)",
    masterPointScale: "County",
    masterPointType: "BLUE",
    p2pChargeRate: "20",
  },
  MAJOR_COUNTY: {
    label: "Major County",
    masterPointScale: "County",
    masterPointType: "GREEN",
    p2pChargeRate: "20",
  },
  NATIONAL_HEAT: {
    label: "National Heat",
    masterPointScale: "National",
    masterPointType: "GREEN",
    p2pChargeRate: "30",
  },
};

/** The level used when a game has no explicit tournament level stored. */
export const DEFAULT_TOURNAMENT_LEVEL: TournamentLevel = "NORMAL_CLUB";

/**
 * Resolve a (possibly null/undefined) stored level to its USEBIO EVENT fields,
 * falling back to the default level so an older game row still exports a valid
 * event.
 */
export function masterPointFieldsFor(
  level: TournamentLevel | null | undefined,
): UsebioMasterPointFields {
  const info = (level && TOURNAMENT_LEVEL_INFO[level]) || undefined;
  const resolved = info ?? TOURNAMENT_LEVEL_INFO[DEFAULT_TOURNAMENT_LEVEL];
  return {
    masterPointScale: resolved.masterPointScale,
    masterPointType: resolved.masterPointType,
    p2pChargeRate: resolved.p2pChargeRate,
  };
}

/**
 * The ordered `{ label, value }` option list for the create-form dropdown, in
 * the EBU's listed order (Normal Club first as the default).
 */
export const TOURNAMENT_LEVEL_OPTIONS: {
  label: string;
  value: TournamentLevel;
}[] = TournamentLevels.map((value) => ({
  label: TOURNAMENT_LEVEL_INFO[value].label,
  value,
}));
