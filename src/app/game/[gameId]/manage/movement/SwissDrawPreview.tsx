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

/** Short "First Last / First Last" label for a pair, from resolved names. */
function pairLabel(
  players: { firstName: string; lastName: string } | null | undefined,
  partner: { firstName: string; lastName: string } | null | undefined,
): string {
  const one = players ? `${players.firstName} ${players.lastName}` : "—";
  const two = partner ? `${partner.firstName} ${partner.lastName}` : "—";
  return `${one} / ${two}`;
}

/**
 * Look up a pair's display label from the resolved names, by stable pair id.
 * Falls back to the raw id if names weren't resolved (e.g. an unseated guest).
 */
function useNameLookup(named: NamedSeating) {
  return useMemo(() => {
    const byPairId = new Map<SwissPairId, string>();
    for (const t of named.tables) {
      byPairId.set(t.nsPairId, pairLabel(t.players.N, t.players.S));
      byPairId.set(t.ewPairId, pairLabel(t.players.E, t.players.W));
    }
    if (named.bye) {
      byPairId.set(
        named.bye.pairId,
        pairLabel(named.bye.players.player1, named.bye.players.player2),
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

  // Re-evaluate advisories against the same history the server used, on every
  // edit. Pure and identical to the server's check.
  const advisories = useMemo(
    () =>
      evaluateSwissSeating(
        seating,
        sitOutPairId,
        rehydrateAdvisoryInputs(preview.advisoryInputs),
      ),
    [seating, sitOutPairId, preview.advisoryInputs],
  );

  const label = (id: SwissPairId) => names.get(id) ?? `Pair ${id}`;

  function pickPair(pairId: SwissPairId) {
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
    if (sitOutPairId == null || selected == null) return;
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
          . Nothing is saved until you tap OK.
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
          {seating.map((table) => (
            <div
              key={table.tableNumber}
              className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
            >
              <div className="mb-2 text-sm font-semibold text-gray-500">
                Table {table.tableNumber}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <PairChip
                  label="N/S"
                  name={label(table.ns)}
                  selected={selected === table.ns}
                  onClick={() => pickPair(table.ns)}
                />
                <PairChip
                  label="E/W"
                  name={label(table.ew)}
                  selected={selected === table.ew}
                  onClick={() => pickPair(table.ew)}
                />
              </div>
            </div>
          ))}

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
              <div className="text-sm font-semibold text-gray-500">
                Sitting out (bye)
              </div>
              <div className="text-base text-gray-800">
                {label(sitOutPairId)}
              </div>
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
  name,
  selected,
  onClick,
}: {
  label: string;
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-lg border p-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        selected
          ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
          : "border-gray-200 bg-gray-50 hover:bg-gray-100"
      }`}
    >
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      <div className="text-sm text-gray-800">{name}</div>
    </button>
  );
}
