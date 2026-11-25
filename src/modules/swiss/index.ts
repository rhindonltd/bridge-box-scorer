/**
 * Swiss: the round-by-round draw for Swiss Pairs and Swiss Teams — the draw
 * engines, director edits and advisories, the round-1 layout, board ranges,
 * pair id encoding, the history the draw is built from, turning a drawn round
 * into a plan, and EBU §3.5 mismatch detection. Pure and browser-safe; depends
 * only on the kernel (`@/model`). See docs/design/modules.md §7.
 *
 * Everything outside `src/modules/swiss` imports from here, never from the
 * module's internal files.
 */

/* ---------- Pairs: engine, edits, advisories ---------- */
export {
  chooseHalfMatchGroup,
  drawSwissRound,
  evaluateSwissSeating,
  halfMatchGroupIds,
  opponentKey,
  reanchorHalfMatchGroup,
  reassignBye,
  rehydrateAdvisoryInputs,
  seatedPairIds,
  serializeAdvisoryInputs,
  swapPairs,
  swissPairHomeSeat,
  swissPairIdFromHomeSeat,
  swissPairIds,
  swissRoundOne,
  type SerializableAdvisoryInputs,
  type SwissDrawInput,
  type SwissDrawResult,
  type SwissHalfMatchGroup,
  type SwissHalfMatchSeating,
  type SwissHomeSeat,
  type SwissPairId,
  type SwissSeating,
  type SwissSeatingAdvisories,
} from "./pairs/swiss-pairing";

/* ---------- Pairs: ids, history, draw input, plan ---------- */
export {
  swissPairIdFromParticipant,
  swissPairIdFromSeat,
  swissPairMovementId,
} from "./pairs/pair-ids";
export {
  swissPairsHistory,
  type SwissBoardHistory,
  type SwissHistoryBoardRow,
  type SwissHistoryMatchRow,
} from "./pairs/history";
export {
  committedRoundNeedsBoards,
  swissCommittedRound,
  type SwissCommittedBoardRow,
  type SwissCommittedMatchRow,
  type SwissCommittedRound,
} from "./pairs/committed-round";
export {
  isValidHalfMatchCommit,
  pairsDrawInput,
  seatedSwissPairIds,
  swissPairsField,
  type RankedSwissPair,
  type SwissPairsDrawSpec,
} from "./pairs/draw-input";
export {
  swissHalfMatchToMaterializable,
  swissRoundToMaterializable,
  type SwissHalfMatchMaterialization,
  type SwissHalfMatchSeat,
} from "./pairs/plan-round";

/* ---------- Teams: engine, edits, advisories ---------- */
export {
  chooseTeamTriple,
  continueLongTriple,
  drawSwissTeamsRound,
  evaluateSwissTeamsRound,
  expandTeamTriple,
  roundOddResolution,
  roundTeamIds,
  swapTeams,
  swissTeamsRoundOne,
  teamOpponentKey,
  type OddHandling,
  type OddRoundResolution,
  type SerializableTeamsAdvisoryInputs,
  type SwissTeamsDrawInput,
  type SwissTeamsDrawInputWithBye,
  type SwissTeamsDrawResult,
  type SwissTeamsRound,
  type SwissTeamsRoundAdvisories,
  type SwissTeamsRoundOneResult,
  type TeamsTriple,
  type TripleBoardSet,
  type TripleComparison,
  type TripleKind,
} from "./teams/swiss-teams-pairing";

/* ---------- Teams: history, draw input, plan ---------- */
export {
  swissTeamsCommittedRound,
  swissTeamsHistory,
  teamTableOf,
  type CommittedTriple,
  type CommittedTripleComparison,
  type SwissTeamsCommittedRound,
  type SwissTeamsHistory,
  type SwissTeamsMatchRow,
  type SwissTeamsTripleRecord,
} from "./teams/history";
export {
  isStructurallyValidTeamsRound,
  resolveTeamsOddRound,
  swissTeamsField,
  type RankedSwissTeam,
} from "./teams/draw-input";
export {
  swissTeamsRoundOneSeed,
  swissTeamsRoundToMaterializable,
  tripleBoardSets,
} from "./teams/plan-round";

/* ---------- Shared ---------- */
export {
  swissHalfMatchBoardSplit,
  swissRoundBoardRange,
  type BoardSpan,
} from "./board-ranges";
export type { SwissStandingEntry } from "./swiss-standings";
export {
  decodeStandingsOrder,
  decodeVpById,
  pairLeaderboardDecoder,
  teamLeaderboardDecoder,
  type LeaderboardDecoder,
  type RankedStandings,
} from "./standings-decode";

/* ---------- §3.5 mismatch detection ---------- */
export {
  MISMATCH_VP_THRESHOLD,
  detectRoundMismatches,
  type DetectRoundInput,
  type MismatchCandidate,
} from "./detection/detect-mismatch";
export {
  detectTeamsRoundMismatches,
  detectTripleMismatches,
  type DetectTeamsRoundInput,
  type DetectTripleMismatchInput,
  type TeamsMismatchCandidate,
  type TripleComparisonInput,
  type TripleMismatchCandidate,
} from "./detection/detect-teams-mismatch";
export {
  detectSwissPairsMismatches,
  detectSwissTeamsMismatches,
  ruledMismatches,
  teamsRoundToAssess,
  type PairsRoundReplay,
  type RuledMismatch,
  type RulingMatchRow,
  type SectionMismatchCandidate,
  type TeamsRoundReplay,
} from "./detection/replay";
