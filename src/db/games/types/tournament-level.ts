/**
 * The EBU "tournament level" a director assigns to an event. This single choice
 * fixes the three USEBIO EVENT fields the EBU uses to charge the club and award
 * Master Points / National Grading Scheme (NGS) updates:
 * `MASTER_POINT_SCALE`, `MASTER_POINT_TYPE`, and `P2P_CHARGE_RATE`.
 *
 * The level→fields mapping (and the human-readable labels) lives in
 * `src/model/tournament-level.ts`; this file is only the stored enum, mirroring
 * the other game enums under `src/db/games/types/`.
 *
 * `NORMAL_CLUB` is the default (a standard weekly duplicate session), so an
 * existing game row with no explicit level still exports a valid, sensible
 * event.
 */
export const TournamentLevels = [
  "NORMAL_CLUB",
  "NO_POINTS_CLUB",
  "POINTS_ONLY_CLUB",
  "DISTRICT_LEAGUE",
  "COUNTY_BLACK",
  "COUNTY_BLUE",
  "MAJOR_COUNTY",
  "NATIONAL_HEAT",
] as const;

export type TournamentLevel = (typeof TournamentLevels)[number];
