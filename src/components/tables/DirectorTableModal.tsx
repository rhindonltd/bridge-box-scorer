"use client";

import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";

import Button from "@/components/common/Button";
import { Toggle } from "@/components/common/Toggle";
import { PillToggle } from "@/components/common/PillToggle";
import { NumberStepper } from "@/components/common/NumberStepper";
import type { Player } from "@/db/games/tables/players";
import type { ParticipantStanding, Seat } from "@/model/participants";
import type { DirectorTable } from "@/components/tables/DirectorTableControls";
import type { StandingChange } from "@/lib/standing-service";

type StandingValue = ParticipantStanding["standing"];

interface Props {
  /** The table whose seats are being managed; null closes the dialog. */
  table: DirectorTable | null;
  /**
   * Whether the section's movement is Swiss. Only Swiss movements let the
   * director mark a pair stationary, so the stationary controls are hidden
   * otherwise.
   */
  isSwiss: boolean;
  /**
   * Whether the game has started. Before start the director can evict pairs and
   * mark empty seats "expected late"; after start those are replaced by the
   * lifecycle standing controls (§2.4).
   */
  started: boolean;
  /** Evict the pair occupying `seat` (a whole NS or EW pair). */
  onEvict: (seat: Seat) => void;
  /**
   * Toggle the stationary flag for a pair at this table. `ns` is true for the
   * North/South pair, false for the East/West pair.
   */
  onToggleStationary: (tableNumber: number, ns: boolean) => void;
  /** Change the lifecycle standing of the pair occupying `seat`. */
  onChangeStanding: (seat: Seat, change: StandingChange) => void;
  /** Mark/unmark an empty `seat` as expected-late. */
  onToggleExpectedLate: (seat: Seat, next: boolean) => void;
  /**
   * Hand `seat` over from the stand-in sitting it to the arriving real pair
   * (EBU §2.4.7). The boards-played split is derived server-side from the
   * entered results.
   */
  /**
   * Whether the post-start "Change standing" control (withdrawn / late /
   * without standing) is offered. False for board-pooled PAIRS events, where a
   * pair withdraws itself from its own device and the director chooses how the
   * missed boards score on the Late Arrivals / Withdrawals screen (design §11).
   * Defaults to true (teams, Swiss).
   */
  showStandingControls?: boolean;
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
 * names, and provides context-sensitive controls:
 *
 *  - Before start: evict a pair, keep a pair stationary (Swiss), mark a pair
 *    "without standing", or mark an empty seat "expected late".
 *  - After start: change a pair's EBU §2.4 lifecycle standing (active /
 *    withdrawn / late / without standing) and see expected-late status.
 *
 * Presentational: it renders from the passed {@link DirectorTable} and emits
 * callbacks; the caller performs the mutations (and typically closes the dialog
 * after an eviction).
 */
export function DirectorTableModal({
  table,
  isSwiss,
  started,
  onEvict,
  onToggleStationary,
  onChangeStanding,
  onToggleExpectedLate,
  showStandingControls = true,
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
                  started={started}
                  onEvict={onEvict}
                  onToggleStationary={onToggleStationary}
                  onChangeStanding={onChangeStanding}
                  onToggleExpectedLate={onToggleExpectedLate}
                  showStandingControls={showStandingControls}
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
  started,
  onEvict,
  onToggleStationary,
  onChangeStanding,
  onToggleExpectedLate,
  showStandingControls,
  onClose,
}: {
  table: DirectorTable;
  isSwiss: boolean;
  started: boolean;
  onEvict: (seat: Seat) => void;
  onToggleStationary: (tableNumber: number, ns: boolean) => void;
  onChangeStanding: (seat: Seat, change: StandingChange) => void;
  onToggleExpectedLate: (seat: Seat, next: boolean) => void;
  showStandingControls: boolean;
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
            standing={table.standing?.N ?? null}
            expectedLate={table.expectedLate?.N ?? false}
            isSwiss={isSwiss}
            started={started}
            onEvict={onEvict}
            onToggleStationary={() =>
              onToggleStationary(table.tableNumber, true)
            }
            onChangeStanding={onChangeStanding}
            onToggleExpectedLate={onToggleExpectedLate}
            showStandingControls={showStandingControls}
          />
          <PairRow
            key={table.pairSeats.ew}
            label="East / West"
            player1={table.players.E}
            player2={table.players.W}
            seat={table.seats.E}
            pairSeat={table.pairSeats.ew}
            stationary={table.stationary?.E ?? false}
            standing={table.standing?.E ?? null}
            expectedLate={table.expectedLate?.E ?? false}
            isSwiss={isSwiss}
            started={started}
            onEvict={onEvict}
            onToggleStationary={() =>
              onToggleStationary(table.tableNumber, false)
            }
            onChangeStanding={onChangeStanding}
            onToggleExpectedLate={onToggleExpectedLate}
            showStandingControls={showStandingControls}
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

/** The human label + pill styling for a non-active standing badge. */
const STANDING_BADGE: Record<
  Exclude<StandingValue, "ACTIVE">,
  { label: string; className: string }
> = {
  WITHDRAWN: {
    label: "Withdrawn",
    className: "bg-red-100 text-red-700",
  },
  LATE: {
    label: "Late",
    className: "bg-amber-100 text-amber-800",
  },
  WITHOUT_STANDING: {
    label: "Without standing",
    className: "bg-gray-200 text-gray-700",
  },
};

function PairRow({
  label,
  player1,
  player2,
  seat,
  pairSeat,
  stationary,
  standing,
  expectedLate,
  isSwiss,
  started,
  onEvict,
  onToggleStationary,
  onChangeStanding,
  onToggleExpectedLate,
  showStandingControls,
}: {
  label: string;
  player1: Omit<Player, "id"> | null;
  player2: Omit<Player, "id"> | null;
  seat: Seat | null;
  /** This pair's seat, present even when empty (drives expected-late). */
  pairSeat: Seat;
  stationary: boolean;
  standing: StandingValue | null;
  expectedLate: boolean;
  isSwiss: boolean;
  started: boolean;
  onEvict: (seat: Seat) => void;
  onToggleStationary: () => void;
  onChangeStanding: (seat: Seat, change: StandingChange) => void;
  onToggleExpectedLate: (seat: Seat, next: boolean) => void;
  showStandingControls: boolean;
}) {
  const occupied = seat != null;
  const stationaryLabelId = `stationary-${label.replace(/\W+/g, "-")}`;
  const expectedLateLabelId = `expected-late-${label.replace(/\W+/g, "-")}`;

  // Which post-start inline form (if any) is open for this pair: the standing
  // editor, or none.
  const [openForm, setOpenForm] = useState<"none" | "standing">("none");

  const badge =
    standing && standing !== "ACTIVE" ? STANDING_BADGE[standing] : null;

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-gray-700">{label}</div>
        {badge && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
        )}
      </div>
      <div className="mt-1 text-base text-gray-900">
        <div>{playerName(player1)}</div>
        <div>{playerName(player2)}</div>
      </div>

      {occupied ? (
        <div className="mt-3 flex flex-col gap-3">
          {/* A pair can be marked (or unmarked) stationary at any time. Before
              the start it shapes the draw from round 2; once play is under way
              it applies to the rounds drawn from then on — rounds already drawn
              are a record and are never changed. */}
          {isSwiss && (
            <div className="flex flex-col gap-1">
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
              {started && (
                <p className="text-xs text-gray-500">
                  Applies to rounds drawn from now on; rounds already drawn stay
                  as they were.
                </p>
              )}
            </div>
          )}

          {!started ? (
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
          ) : openForm === "standing" ? (
            <StandingForm
              label={label}
              current={standing ?? "ACTIVE"}
              onCancel={() => setOpenForm("none")}
              onSave={(change) => {
                onChangeStanding(seat, change);
                setOpenForm("none");
              }}
            />
          ) : (
            <>
              {showStandingControls && (
                <button
                  type="button"
                  onClick={() => setOpenForm("standing")}
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <span aria-hidden="true">Change standing</span>
                  <span className="sr-only">
                    Change standing for {label} pair
                  </span>
                </button>
              )}
            </>
          )}
        </div>
      ) : !started ? (
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
      ) : expectedLate ? (
        <div className="mt-2 flex flex-col gap-1">
          <div className="text-sm font-medium text-amber-800">
            Expected late — not yet seated
          </div>
          <p className="text-xs text-gray-500">
            The pair can join from a device when they arrive.
          </p>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The post-start inline standing editor for a single pair. Local state only;
 * emits a {@link StandingChange} via `onSave`. Offers Active / Withdrawn / Late
 * / Without standing, and — for Withdrawn / Late — a round number, a REMOVE vs
 * PENALISED treatment, and (when PENALISED) a 0..40 fine percentage.
 */
function StandingForm({
  label,
  current,
  onSave,
  onCancel,
}: {
  label: string;
  current: StandingValue;
  onSave: (change: StandingChange) => void;
  onCancel: () => void;
}) {
  const [standing, setStanding] = useState<StandingValue>(current);
  const [round, setRound] = useState(1);
  const [treatment, setTreatment] = useState<"REMOVE" | "PENALISED">("REMOVE");
  const [finePercent, setFinePercent] = useState(0);

  const needsDetail = standing === "WITHDRAWN" || standing === "LATE";
  const roundLabelId = `standing-round-${label.replace(/\W+/g, "-")}`;
  const fineLabelId = `standing-fine-${label.replace(/\W+/g, "-")}`;

  function handleSave() {
    if (standing === "WITHDRAWN") {
      onSave({
        standing: "WITHDRAWN",
        withdrawnInRound: round,
        treatment,
        ...(treatment === "PENALISED" ? { finePercent } : {}),
      });
      return;
    }
    if (standing === "LATE") {
      onSave({
        standing: "LATE",
        arrivedInRound: round,
        treatment,
        ...(treatment === "PENALISED" ? { finePercent } : {}),
      });
      return;
    }
    if (standing === "WITHOUT_STANDING") {
      onSave({ standing: "WITHOUT_STANDING" });
      return;
    }
    onSave({ standing: "ACTIVE" });
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
      <PillToggle<StandingValue>
        name={`standing-${label.replace(/\W+/g, "-")}`}
        legend={`Standing for ${label}`}
        options={[
          { value: "ACTIVE", label: "Active" },
          { value: "WITHDRAWN", label: "Withdrawn" },
          { value: "LATE", label: "Late" },
          { value: "WITHOUT_STANDING", label: "No standing" },
        ]}
        value={standing}
        onChange={setStanding}
      />

      {needsDetail && (
        <>
          <div className="flex items-center justify-between gap-3">
            <span
              id={roundLabelId}
              className="text-sm font-medium text-gray-700"
            >
              {standing === "WITHDRAWN"
                ? "Withdrew in round"
                : "Arrived in round"}
            </span>
            <div aria-labelledby={roundLabelId}>
              <NumberStepper min={1} value={round} onChange={setRound} />
            </div>
          </div>

          <PillToggle<"REMOVE" | "PENALISED">
            name={`treatment-${label.replace(/\W+/g, "-")}`}
            legend={`Treatment for ${label}`}
            options={[
              { value: "REMOVE", label: "Remove" },
              { value: "PENALISED", label: "Penalised" },
            ]}
            value={treatment}
            onChange={setTreatment}
          />

          {treatment === "PENALISED" && (
            <div className="flex items-center justify-between gap-3">
              <span
                id={fineLabelId}
                className="text-sm font-medium text-gray-700"
              >
                Fine %
              </span>
              <div aria-labelledby={fineLabelId}>
                <NumberStepper
                  min={0}
                  max={40}
                  value={finePercent}
                  zeroCharacter="0"
                  onChange={setFinePercent}
                />
              </div>
            </div>
          )}
        </>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="flex-1 rounded-lg border border-blue-600 bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Save
        </button>
      </div>
    </div>
  );
}
