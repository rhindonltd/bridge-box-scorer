"use client";

import { useMemo, useState } from "react";
import type { SwissPreviewAck } from "@/lib/swiss-service";
import type { NamedSeating } from "@/services/swiss-seating-names";
import {
  evaluateSwissSeating,
  reassignBye,
  rehydrateAdvisoryInputs,
  swapPairs,
  type SwissPairId,
  type SwissSeating,
} from "@/movement/swiss/swiss-pairing";


const primaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

const secondaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

/** The two players of a pair as separate "First Last" lines, from resolved names. */
function pairNames(
  players: { firstName: string; lastName: string } | null | undefined,
  partner: { firstName: string; lastName: string } | null | undefined,
): [string, string] {
  const one = players ? `${players.firstName} ${players.lastName}` : "—";
  const two = partner ? `${partner.firstName} ${partner.lastName}` : "—";
  return [one, two];
}

/**
 * Look up a pair's two player names from the resolved names, by stable pair id.
 * Falls back to the raw id if names weren't resolved (e.g. an unseated guest).
 */
function useNameLookup(named: NamedSeating) {
  return useMemo(() => {
    const byPairId = new Map<SwissPairId, [string, string]>();
    for (const t of named.tables) {
      byPairId.set(t.nsPairId, pairNames(t.players.N, t.players.S));
      byPairId.set(t.ewPairId, pairNames(t.players.E, t.players.W));
    }
    if (named.bye) {
      byPairId.set(
        named.bye.pairId,
        pairNames(named.bye.players.player1, named.bye.players.player2),
      );
    }
    return byPairId;
  }, [named]);
}

export interface SwissDrawPreviewProps {
  preview: SwissPreviewAck;
  /** True while the commit request is in flight. */
  committing: boolean;
  /** Inline error from a failed commit, if any. */
  error: string | null;
  /** Accept the (possibly edited) seating. */
  onConfirm: (seating: SwissSeating[], sitOutPairId: SwissPairId | null) => void;
  onCancel: () => void;
}

/**
 * Full-screen review of a freshly-drawn Swiss round before it is committed.
 *
 * Shows each table's proposed pairing with player names and the sit-out (bye)
 * pair, plus advisories (a repeat pairing, a stationary conflict, a bye
 * repeat). The director may hand-adjust before accepting: tap two pairs to
 * swap their seats, or tap a seated pair then the bye slot to make that pair
 * sit out instead. Advisories re-check live on every edit (the same pure check
 * the server ran) but never block — the director can commit an override. OK
 * commits exactly what is shown; Cancel discards it (nothing was written).
 */
export function SwissDrawPreview({
  preview,
  committing,
  error,
  onConfirm,
  onCancel,
}: SwissDrawPreviewProps) {
  const names = useNameLookup(preview.named);

  const [seating, setSeating] = useState<SwissSeating[]>(preview.seating);
  const [sitOutPairId, setSitOutPairId] = useState<SwissPairId | null>(
    preview.sitOutPairId,
  );
  // The pair the director has picked as the first half of a swap, or null.
  const [selected, setSelected] = useState<SwissPairId | null>(null);

  // The event history the advisories are computed against (same as the server).
  const drawInput = useMemo(
    () => rehydrateAdvisoryInputs(preview.advisoryInputs),
    [preview.advisoryInputs],
  );

  // Re-evaluate advisories on every edit. Pure and identical to the server's
  // check; drives both the warnings and the per-table highlights.
  const advisories = useMemo(
    () => evaluateSwissSeating(seating, sitOutPairId, drawInput),
    [seating, sitOutPairId, drawInput],
  );

  // Stationary pairs (kept at a fixed seat all event) cannot be moved by the
  // director — the draw already honours their home seat, so they are marked and
  // locked from swaps/bye, exactly as on the table-setup screen.
  const stationaryPairIds = useMemo(
    () => new Set(drawInput.stationary.keys()),
    [drawInput],
  );
  const isStationary = (id: SwissPairId) => stationaryPairIds.has(id);

  // Tables the director should check (a repeat pairing or stationary conflict).
  const problemTables = useMemo(
    () => new Set(advisories.problemTables),
    [advisories],
  );

  const nameLines = (id: SwissPairId): [string, string] =>
    names.get(id) ?? [`Pair ${id}`, ""];

  // Running VP total per pair, from the standings the draw ranked on. Shown on
  // each card so the director sees the field's totals inline (no separate list).
  const totals = useMemo(() => {
    const byId = new Map<SwissPairId, number>();
    for (const s of preview.standings) byId.set(s.id, s.total);
    return byId;
  }, [preview.standings]);
  const totalFor = (id: SwissPairId) => totals.get(id) ?? null;

  function pickPair(pairId: SwissPairId) {
    // A stationary pair is locked at its seat; it can't take part in a swap.
    if (isStationary(pairId)) return;
    if (selected == null) {
      setSelected(pairId);
      return;
    }
    if (selected === pairId) {
      setSelected(null);
      return;
    }
    // Second pick: swap the two seated pairs.
    setSeating((s) => swapPairs(s, selected, pairId));
    setSelected(null);
  }

  function pickBye() {
    // Only meaningful when there's a sit-out and a pair is selected to swap in.
    // A stationary pair can't be given the bye (it stays at its home seat).
    if (sitOutPairId == null || selected == null || isStationary(selected)) {
      return;
    }
    const result = reassignBye(seating, sitOutPairId, selected);
    setSeating(result.seating);
    setSitOutPairId(result.sitOutPairId);
    setSelected(null);
  }

  const advisoryMessages: string[] = [];
  if (advisories.hadUnavoidableRepeat) {
    advisoryMessages.push(
      "A pairing repeats an earlier-round opponent. You can adjust the seating or accept it.",
    );
  }
  if (advisories.hadStationaryConflict) {
    advisoryMessages.push(
      "A stationary pair is not at its home seat, or two stationary pairs meet.",
    );
  }
  if (advisories.byeRepeat) {
    advisoryMessages.push("The pair sitting out has already had a bye.");
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="swiss-draw-preview">
      <div className="shrink-0 border-b border-gray-200 bg-gray-100 px-4 py-3 text-center font-semibold text-gray-800">
        Round {preview.roundNumber} — review draw
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-4">
        <p className="mb-3 text-sm text-gray-600">
          Review the draw for round {preview.roundNumber}. Tap two pairs to swap
          their seats
          {sitOutPairId != null
            ? ", or tap a pair then the sit-out slot to give it the bye"
            : ""}
          . Stationary pairs (amber) stay put and can&apos;t be moved. Each pair
          shows its current total (the order the draw ranks on). Nothing is saved
          until you tap OK.
        </p>

        {advisoryMessages.length > 0 && (
          <div
            className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
            role="status"
            data-testid="draw-advisories"
          >
            <ul className="list-disc pl-5">
              {advisoryMessages.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {seating.map((table) => {
            const hasProblem = problemTables.has(table.tableNumber);
            return (
              <div
                key={table.tableNumber}
                data-testid={`table-card-${table.tableNumber}`}
                data-problem={hasProblem ? "true" : undefined}
                className={`rounded-xl border bg-white p-3 shadow-sm ${
                  hasProblem
                    ? "border-amber-400 ring-2 ring-amber-400"
                    : "border-gray-200"
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-500">
                    Table {table.tableNumber}
                  </span>
                  {hasProblem && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                      Check this table
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <PairChip
                    label="N/S"
                    names={nameLines(table.ns)}
                    total={totalFor(table.ns)}
                    stationary={isStationary(table.ns)}
                    selected={selected === table.ns}
                    onClick={() => pickPair(table.ns)}
                  />
                  <PairChip
                    label="E/W"
                    names={nameLines(table.ew)}
                    total={totalFor(table.ew)}
                    stationary={isStationary(table.ew)}
                    selected={selected === table.ew}
                    onClick={() => pickPair(table.ew)}
                  />
                </div>
              </div>
            );
          })}

          {sitOutPairId != null && (
            <button
              type="button"
              onClick={pickBye}
              disabled={selected == null}
              data-testid="draw-bye"
              className={`rounded-xl border border-dashed p-3 text-left transition ${
                selected == null
                  ? "border-gray-200 bg-gray-50"
                  : "border-blue-400 bg-blue-50 hover:bg-blue-100"
              }`}
            >
              <div className="-mx-3 -mt-3 mb-2 flex items-baseline justify-between gap-2 rounded-t-xl bg-gray-200 px-3 py-1.5">
                <span className="text-xs font-semibold text-gray-600">
                  Sitting out (bye)
                </span>
                {totalFor(sitOutPairId) != null && (
                  <span className="text-xs font-medium text-gray-600 tabular-nums">
                    {totalFor(sitOutPairId)!.toFixed(2)} VP
                  </span>
                )}
              </div>
              {nameLines(sitOutPairId).map((n, i) => (
                <div key={i} className="text-sm text-gray-800">
                  {n}
                </div>
              ))}
              {selected != null && (
                <div className="mt-1 text-xs text-blue-700">
                  Tap to give the bye to the selected pair
                </div>
              )}
            </button>
          )}
        </div>

        {error && (
          <p
            className="mt-3 text-sm font-medium text-red-700"
            role="alert"
            data-testid="draw-error"
          >
            {error}
          </p>
        )}
      </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 p-2">
        <div className="mx-auto flex w-full max-w-2xl gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={committing}
            className={secondaryButtonClass}
            data-testid="draw-cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(seating, sitOutPairId)}
            disabled={committing || advisories.structuralError}
            className={primaryButtonClass}
            data-testid="draw-confirm"
          >
            {committing ? "Saving…" : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PairChip({
  label,
  names,
  total,
  stationary,
  selected,
  onClick,
}: {
  label: string;
  /** The pair's two player names, shown on separate lines. */
  names: [string, string];
  /** The pair's running VP total, or null when not yet on the leaderboard. */
  total: number | null;
  /** Whether this pair is stationary (fixed seat all event) — locked from swaps. */
  stationary: boolean;
  selected: boolean;
  onClick: () => void;
}) {
  // A stationary pair is display-only: it can't be selected or swapped, and is
  // marked with an amber ring + badge (matching the table-setup screen).
  const base =
    "relative overflow-hidden rounded-lg border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
  const stateClasses = stationary
    ? "border-amber-400 bg-amber-50 ring-2 ring-amber-400 cursor-default"
    : selected
      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
      : "border-gray-200 bg-gray-50 hover:bg-gray-100";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={stationary}
      aria-pressed={stationary ? undefined : selected}
      className={`${base} ${stateClasses}`}
    >
      {/* Header band: direction + running total, on a darker grey. */}
      <div className="flex items-baseline justify-between gap-2 bg-gray-200 px-2 py-1">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        {total != null && (
          <span className="text-xs font-medium text-gray-600 tabular-nums">
            {total.toFixed(2)} VP
          </span>
        )}
      </div>
      <div className="px-2 py-1.5">
        {names.map((n, i) => (
          <div key={i} className="text-sm text-gray-800">
            {n}
          </div>
        ))}
        {stationary && (
          <span className="mt-1 inline-block rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950">
            Stationary
          </span>
        )}
      </div>
    </button>
  );
}
