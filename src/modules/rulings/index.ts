/**
 * Rulings: every rewrite of results that happens before scoring — who a board
 * is credited to, which results the director has changed, and who is left out
 * of the ranking. Pure and browser-safe; depends only on the kernel
 * (`@/model`). See docs/design/modules.md §8.
 */

export {
  applyRulings,
  appliesPairsAbsences,
  type DirectorDecisions,
  type RulingsInput,
} from "./apply-rulings";
export type { RuledEvent, RuledInstance } from "@/model/ruled-event";

export { ruledBoardInstances, type TravellerRow } from "./board-instances";

export { applySeatSwap, applySeatSwaps, type SeatSwappable } from "./seat-swap";
export {
  resolveAbsentRow,
  isAbsentRow,
  type AbsenceBoardRow,
  type AbsentRowResolution,
} from "./absence";
export { applyAbsences, pairsStandingsForRanking } from "./apply-absences";
export {
  participantStandings,
  resolveStandings,
  type StandingBoardRow,
} from "./standings";
export {
  arrivalAnchorOf,
  buildOccupantScoredIdResolver,
  inheritStandInOccupancyIds,
  mergedLineOf,
  occupancyCoversBoard,
  scoredIdByOccupancyId,
  seatIsOneLine,
  type OccupantCandidate,
  type RankedCandidate,
} from "./occupants";
