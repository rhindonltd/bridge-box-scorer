import type { ReadinessItem } from "@/app/game/[gameId]/manage/export/ExportReadinessPage";
import type { OutstandingBoard } from "@/db/games/queries/get-outstanding-boards";

/** The facts the readiness checklist is derived from. */
export interface ExportReadinessInput {
  /** Total playable boards (0 until the game has started / summary loads). */
  totalPlayable: number;
  /** Playable boards that have a final result. */
  finalized: number;
  /** Club name + EBU number are both set (needed for any USEBIO file). */
  clubConfigured: boolean;
  /** BridgeWebs club code + password are set. */
  bridgewebsConfigured: boolean;
  /** EBU number + password are set. */
  ebuConfigured: boolean;
  /**
   * The specific outstanding boards, when few enough to be worth listing
   * (the caller only loads them below a small threshold). When present and
   * non-empty they are attached to the results item for display; otherwise the
   * results item shows just the count.
   */
  outstandingBoards?: OutstandingBoard[];
  /**
   * Whether the event has more than one section. Only then is a board's section
   * shown in its card title (a single-section event's "A" prefix is noise, so
   * the table number stands alone).
   */
  multiSection?: boolean;
}

/**
 * Turn the raw export prerequisites into the ordered checklist the readiness
 * screen renders. Pure (no I/O) so the mapping — which facts are blockers vs
 * warnings vs optional — is unit-testable on its own.
 *
 * - Results: a `warning` while any playable board is outstanding (USEBIO and
 *   both uploads need every result in to be complete), `ready` once all are in.
 * - Club information: a hard `blocker` — without it no USEBIO file can be built
 *   at all, so every export is unavailable.
 * - BridgeWebs / EBU: `info` when not configured (only that one upload is
 *   unavailable; the downloads still work), `ready` when configured.
 */
export function buildExportReadiness(
  input: ExportReadinessInput,
): ReadinessItem[] {
  const {
    totalPlayable,
    finalized,
    clubConfigured,
    bridgewebsConfigured,
    ebuConfigured,
    outstandingBoards,
    multiSection = false,
  } = input;

  const outstanding = Math.max(totalPlayable - finalized, 0);
  const allResultsIn = totalPlayable > 0 && outstanding === 0;

  const resultsItem: ReadinessItem = allResultsIn
    ? {
        id: "results",
        title: "Results entered",
        detail: `All ${totalPlayable} results are in.`,
        level: "ready",
      }
    : {
        id: "results",
        title: "Results entered",
        detail:
          totalPlayable === 0
            ? "No results are in yet."
            : `${outstanding} of ${totalPlayable} results ${
                outstanding === 1 ? "is" : "are"
              } outstanding.`,
        level: "warning",
        // Only attach the specifics when the caller supplied them (it does so
        // only when few are outstanding); otherwise the count stands alone.
        boards:
          outstandingBoards && outstandingBoards.length > 0
            ? outstandingBoards.map((b) => ({
                id: `${b.section}-${b.tableNumber}-${b.boardNumber}`,
                title: boardTitle(b, multiSection),
                players: pairsLabel(b.nsPair, b.ewPair),
              }))
            : undefined,
      };

  const clubItem: ReadinessItem = clubConfigured
    ? {
        id: "club",
        title: "Club information",
        detail: "Club name and EBU number are set.",
        level: "ready",
      }
    : {
        id: "club",
        title: "Club information",
        detail:
          "Set the club name and EBU number in Settings — the results file can't be generated without them.",
        level: "blocker",
      };

  const bridgewebsItem: ReadinessItem = bridgewebsConfigured
    ? {
        id: "bridgewebs",
        title: "BridgeWebs",
        detail: "Connected — you can upload results to BridgeWebs.",
        level: "ready",
      }
    : {
        id: "bridgewebs",
        title: "BridgeWebs",
        detail:
          "Not configured. Add your club code and password in Settings to upload to BridgeWebs.",
        level: "info",
      };

  const ebuItem: ReadinessItem = ebuConfigured
    ? {
        id: "ebu",
        title: "EBU",
        detail: "Connected — you can submit results to the EBU.",
        level: "ready",
      }
    : {
        id: "ebu",
        title: "EBU",
        detail:
          "Not configured. Add your EBU number and password in Settings to submit to the EBU.",
        level: "info",
      };

  return [resultsItem, clubItem, bridgewebsItem, ebuItem];
}

/**
 * The card title for an outstanding board: round, table, and board — with the
 * section called out only for a multi-section event (where it disambiguates the
 * table number, which restarts within each section). For a single-section event
 * the section prefix is dropped so the table number stands alone.
 */
function boardTitle(b: OutstandingBoard, multiSection: boolean): string {
  const table = multiSection
    ? `Section ${b.section} · Table ${b.tableNumber}`
    : `Table ${b.tableNumber}`;
  return `Round ${b.roundNumber} · ${table} · Board ${b.boardNumber}`;
}

/** "NS vs EW" for a board, tolerant of an empty (unseated) side. */
function pairsLabel(
  nsPair: string | null,
  ewPair: string | null,
): string {
  const ns = nsPair ?? "—";
  const ew = ewPair ?? "—";
  return `${ns} vs ${ew}`;
}
