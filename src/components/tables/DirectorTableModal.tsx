"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";

import Button from "@/components/common/Button";
import { Toggle } from "@/components/common/Toggle";
import type { Player } from "@/db/games/tables/players";
import type { Seat } from "@/model/participants";
import type { DirectorTable } from "@/components/tables/DirectorTableControls";

interface Props {
  /** The table whose seats are being managed; null closes the dialog. */
  table: DirectorTable | null;
  /**
   * Whether the section's movement is Swiss. Only Swiss movements let the
   * director mark a pair stationary, so the stationary controls are hidden
   * otherwise.
   */
  isSwiss: boolean;
  /** Evict the pair occupying `seat` (a whole NS or EW pair). */
  onEvict: (seat: Seat) => void;
  /**
   * Toggle the stationary flag for a pair at this table. `ns` is true for the
   * North/South pair, false for the East/West pair.
   */
  onToggleStationary: (tableNumber: number, ns: boolean) => void;
  /** Mark/unmark an empty `seat` as expected-late. */
  onToggleExpectedLate: (seat: Seat, next: boolean) => void;
  /** Close the dialog. */
  onClose: () => void;
}

/** A player's display name, or a placeholder when the seat is empty. */
function playerName(player: Omit<Player, "id"> | null): string {
  if (!player) return "—";
  return `${player.firstName} ${player.lastName}`.trim();
}

/**
 * Per-table management dialog for the director's Tables screen. Shows the two
 * pairs seated at the table (North/South and East/West) with their player
 * names, and provides the setup-time controls: evict a pair, keep a pair
 * stationary (Swiss), or mark an empty seat "expected late". Once the game has
 * started the director manages pairs and teams from the Pairs / Teams rosters
 * instead, so this dialog is only reached before the start.
 *
 * Presentational: it renders from the passed {@link DirectorTable} and emits
 * callbacks; the caller performs the mutations (and typically closes the dialog
 * after an eviction).
 */
export function DirectorTableModal({
  table,
  isSwiss,
  onEvict,
  onToggleStationary,
  onToggleExpectedLate,
  onClose,
}: Props) {
  const open = table != null;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-150"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
              {table && (
                <TableModalBody
                  table={table}
                  isSwiss={isSwiss}
                  onEvict={onEvict}
                  onToggleStationary={onToggleStationary}
                  onToggleExpectedLate={onToggleExpectedLate}
                  onClose={onClose}
                />
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

function TableModalBody({
  table,
  isSwiss,
  onEvict,
  onToggleStationary,
  onToggleExpectedLate,
  onClose,
}: {
  table: DirectorTable;
  isSwiss: boolean;
  onEvict: (seat: Seat) => void;
  onToggleStationary: (tableNumber: number, ns: boolean) => void;
  onToggleExpectedLate: (seat: Seat, next: boolean) => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Grey heading bar matching the movement preview dialog. */}
      <div className="shrink-0 border-b border-gray-200">
        <Dialog.Title className="bg-gray-300 p-4 text-lg font-semibold text-gray-900">
          Table {table.tableNumber}
        </Dialog.Title>
      </div>

      {/* Scrollable body, so a tall table (expanded controls) never pushes the
          panel past the viewport and clips the rounded corners / margins. */}
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <Dialog.Description className="text-sm text-gray-600">
          Manage the pairs seated at this table.
        </Dialog.Description>

        <div className="mt-4 flex flex-col gap-3">
          {/* Keyed by each pair's own seat so React keeps a stable identity for
            the two rows. Without keys the siblings reconcile by position, and
            because PairRow holds local state (openForm) and switches subtree
            shape between its occupied and empty branches, a seated row and an
            empty row would share instance state — making one row's toggle
            appear to drive the other's. */}
          <PairRow
            key={table.pairSeats.ns}
            label="North / South"
            player1={table.players.N}
            player2={table.players.S}
            seat={table.seats.N}
            pairSeat={table.pairSeats.ns}
            stationary={table.stationary?.N ?? false}
            expectedLate={table.expectedLate?.N ?? false}
            isSwiss={isSwiss}
            onEvict={onEvict}
            onToggleStationary={() =>
              onToggleStationary(table.tableNumber, true)
            }
            onToggleExpectedLate={onToggleExpectedLate}
          />
          <PairRow
            key={table.pairSeats.ew}
            label="East / West"
            player1={table.players.E}
            player2={table.players.W}
            seat={table.seats.E}
            pairSeat={table.pairSeats.ew}
            stationary={table.stationary?.E ?? false}
            expectedLate={table.expectedLate?.E ?? false}
            isSwiss={isSwiss}
            onEvict={onEvict}
            onToggleStationary={() =>
              onToggleStationary(table.tableNumber, false)
            }
            onToggleExpectedLate={onToggleExpectedLate}
          />
        </div>
      </div>

      {/* Fixed footer (outside the scroll area), matching the movement dialog. */}
      <div className="flex shrink-0 border-t border-gray-200 p-3">
        <Button
          value="Done"
          onClick={onClose}
          bgColour="bg-gray-100"
          textColour="text-gray-900"
          hoverColour="hover:bg-gray-200"
        />
      </div>
    </>
  );
}

function PairRow({
  label,
  player1,
  player2,
  seat,
  pairSeat,
  stationary,
  expectedLate,
  isSwiss,
  onEvict,
  onToggleStationary,
  onToggleExpectedLate,
}: {
  label: string;
  player1: Omit<Player, "id"> | null;
  player2: Omit<Player, "id"> | null;
  seat: Seat | null;
  /** This pair's seat, present even when empty (drives expected-late). */
  pairSeat: Seat;
  stationary: boolean;
  expectedLate: boolean;
  isSwiss: boolean;
  onEvict: (seat: Seat) => void;
  onToggleStationary: () => void;
  onToggleExpectedLate: (seat: Seat, next: boolean) => void;
}) {
  const occupied = seat != null;
  const stationaryLabelId = `stationary-${label.replace(/\W+/g, "-")}`;
  const expectedLateLabelId = `expected-late-${label.replace(/\W+/g, "-")}`;

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <div className="mt-1 text-base text-gray-900">
        <div>{playerName(player1)}</div>
        <div>{playerName(player2)}</div>
      </div>

      {occupied ? (
        <div className="mt-3 flex flex-col gap-3">
          {/* A pair can be marked (or unmarked) stationary; it shapes the draw
              from round 2. (Once the game is running this is done from the
              Pairs roster.) */}
          {isSwiss && (
            <div className="flex items-center justify-between gap-3">
              <span
                id={stationaryLabelId}
                className="text-sm font-medium text-gray-700"
              >
                Stationary
              </span>
              <Toggle
                value={stationary}
                offLabel="No"
                onLabel="Yes"
                labelledBy={stationaryLabelId}
                onChange={onToggleStationary}
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => onEvict(seat)}
            className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {/* Visible text is the terse label; the full accessible name
                (which names the pair) is carried by the visually-hidden
                span, so the two do not disagree — a
                label-content-name-mismatch (WCAG 2.5.3). */}
            <span aria-hidden="true">Evict pair</span>
            <span className="sr-only">Evict {label} pair</span>
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <span
              id={expectedLateLabelId}
              className="text-sm font-medium text-gray-700"
            >
              Expected late
            </span>
            <Toggle
              value={expectedLate}
              offLabel="No"
              onLabel="Yes"
              labelledBy={expectedLateLabelId}
              onChange={(next) => onToggleExpectedLate(pairSeat, next)}
            />
          </div>
          <p className="text-xs text-gray-500">
            Start without this pair; seat them when they arrive.
          </p>
        </div>
      )}
    </div>
  );
}
