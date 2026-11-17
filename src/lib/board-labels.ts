import type { OutstandingBoard } from "@/db/games/queries/get-outstanding-boards";

/**
 * The card title for an outstanding board: round, table, and board, with the
 * section called out only for a multi-section event (where it disambiguates the
 * table number, which restarts within each section). For a single-section event
 * the section prefix is dropped so the table number stands alone.
 */
export function boardTitle(
  b: OutstandingBoard,
  multiSection: boolean,
  sectionLabels: Record<string, string>,
): string {
  const table = multiSection
    ? `${sectionLabels[b.section] ?? b.section} · Table ${b.tableNumber}`
    : `Table ${b.tableNumber}`;
  return `Round ${b.roundNumber} · ${table} · Board ${b.boardNumber}`;
}

/** "NS vs EW" for a board, tolerant of an empty (unseated) side. */
export function pairsLabel(
  nsPair: string | null,
  ewPair: string | null,
): string {
  const ns = nsPair ?? "—";
  const ew = ewPair ?? "—";
  return `${ns} vs ${ew}`;
}
