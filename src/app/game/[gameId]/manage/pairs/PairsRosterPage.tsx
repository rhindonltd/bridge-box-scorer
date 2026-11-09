"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { Toggle } from "@/components/common/Toggle";
import { PillToggle } from "@/components/common/PillToggle";
import type { SubstitutionSeat } from "@/db/games/queries/find-substitution-seats";
import type { OccupantEligibilityInput } from "@/lib/game-service";
import type { AbsentPair } from "@/db/games/queries/find-absent-pairs";
import type { AbsenceTreatment } from "@/model/absence";
import type {
  RosterEntry,
  RosterStatus,
} from "@/db/games/queries/find-game-roster";

export interface SubstitutionSaveOptions {
  /** Score the seat as two separate lines (true) or one merged line (false). */
  split: boolean;
  /** Per-occupant eligibility for the local ranking. */
  eligibility: OccupantEligibilityInput[];
}

/** The per-row action handlers the roster needs. */
export interface PairsRosterActions {
  /** Persist a substitution seat's split + eligibility choices. */
  onSaveSubstitution: (
    seat: string,
    options: SubstitutionSaveOptions,
  ) => Promise<void>;
  /** Set how a late / withdrawn pair's missed boards score. */
  onSetAbsenceTreatment: (
    seat: string,
    treatment: AbsenceTreatment,
  ) => Promise<void>;
  /** Director withdraws the pair at `seat` from the round it is on. */
  onWithdraw: (seat: string) => Promise<void>;
  /**
   * Render the "reinstate on the returning device" code panel for `seat` — a
   * REINSTATE seat-transfer code the returning device claims. Supplied by the
   * container (it owns the game id); the page just mounts it under the row.
   */
  renderReinstatePanel: (seat: string) => ReactNode;
  /**
   * Render the "move to a new device" code panel for `seat` — a CHANGE_DEVICE
   * code minted by the director for a pair whose device has died. Optional so a
   * host that cannot mint one simply omits the control.
   */
  renderMoveDevicePanel?: (seat: string) => ReactNode;
}

export interface PairsRosterPageProps extends PairsRosterActions {
  /** Header right-hand content — the play⇄manage switch on a director device. */
  headerRight?: ReactNode;
  /** Back to the manage menu. */
  onBack: () => void;
  /** Every pair in the game with its status. */
  roster: RosterEntry[];
  /**
   * Whether this is a PAIRS game. Gates the split=no NGS/Masterpoint warning on
   * a substitution row (teams credit the team, so it doesn't apply). Defaults
   * to true.
   */
  isPairs?: boolean;
}

/** The badge label + colour for each roster status, including the green Active. */
const STATUS_BADGE: Record<RosterStatus, { label: string; className: string }> =
  {
    ACTIVE: { label: "Active", className: "bg-green-100 text-green-700" },
    WITHDRAWN: { label: "Withdrawn", className: "bg-red-100 text-red-700" },
    LATE: { label: "Late", className: "bg-amber-100 text-amber-800" },
    SUBSTITUTED: {
      label: "Substituted",
      className: "bg-blue-100 text-blue-700",
    },
    WITHOUT_STANDING: {
      label: "Without standing",
      className: "bg-gray-200 text-gray-700",
    },
    NOT_ARRIVED: {
      label: "Not arrived",
      className: "bg-amber-100 text-amber-800",
    },
  };

/**
 * The director's "Pairs" roster (design §11): every pair in a board-pooled
 * pairs game with its current status. Most are Active; others show Withdrawn,
 * Late, Substituted, Without standing or Not arrived. Tapping a row opens the
 * actions for that pair — withdraw / reinstate, the AVE−/AVE+ vs Removed choice
 * for a late or withdrawn pair, or the split / eligibility / main-pair choices
 * for a substituted seat.
 */
export function PairsRosterPage({
  headerRight,
  onBack,
  roster,
  isPairs = true,
  onSaveSubstitution,
  onSetAbsenceTreatment,
  onWithdraw,
  renderReinstatePanel,
  renderMoveDevicePanel,
}: PairsRosterPageProps) {
  const [openSeat, setOpenSeat] = useState<string | null>(null);
  // Which section's pairs are shown; "ALL" shows every section. Defaults to
  // all so the whole roster is visible at a glance.
  const [section, setSection] = useState<string>(ALL_SECTIONS);

  // Group the (already attention-sorted) roster into its sections, keyed by the
  // seat's section letter. A single-section game has one group and no pills.
  const groups = groupBySection(roster);
  const multiSection = groups.length > 1;
  const visible = multiSection
    ? groups.filter((g) => section === ALL_SECTIONS || g.section === section)
    : groups;

  const rowProps = {
    isPairs,
    openSeat,
    onToggleSeat: (seat: string) =>
      setOpenSeat((s) => (s === seat ? null : seat)),
    onSaveSubstitution,
    onSetAbsenceTreatment,
    onWithdraw,
    renderReinstatePanel,
    renderMoveDevicePanel,
  };

  return (
    <GamePageLayout
      headerTitle="Pairs"
      contentMode="scroll"
      backAction={onBack}
      headerRight={headerRight}
    >
      <div className="flex flex-col gap-4 px-6 pb-8 pt-6 max-w-sm w-full mx-auto">
        <p className="text-sm text-gray-600">
          Every pair in the game. Tap a pair to withdraw or reinstate it, or to
          choose how a late, withdrawn or substituted pair&rsquo;s boards score.
        </p>

        {/* Section pills (multi-section only): All + one per section, matching
            the table-setup screen. The container cards below filter to the
            chosen section. */}
        {multiSection && (
          <RosterSectionPills
            sections={groups.map((g) => g.section)}
            selected={section}
            onSelect={setSection}
          />
        )}

        {roster.length === 0 ? (
          <p className="text-sm text-gray-500">No pairs seated yet.</p>
        ) : (
          visible.map((group) => (
            <SectionContainer
              key={group.section}
              section={group.section}
              entries={group.entries}
              showHeader={multiSection}
              {...rowProps}
            />
          ))
        )}
      </div>
    </GamePageLayout>
  );
}

/** Sentinel value for the "All sections" pill. */
const ALL_SECTIONS = "ALL";

/** One section's worth of roster entries. */
interface SectionGroup {
  section: string;
  entries: RosterEntry[];
}

/**
 * The section letter of a section-qualified seat ("A1NS" → "A"): the leading
 * run of non-digit characters. Seats are always section-prefixed, so this is
 * total; a malformed seat falls back to the whole string.
 */
function sectionOf(seat: string): string {
  return seat.match(/^[^0-9]+/)?.[0] ?? seat;
}

/**
 * A sort key for a seat within its section: table NUMBER first, then the
 * direction with NS before EW (the convention throughout — see SEAT_REGEX),
 * so a section reads 1NS, 1EW, 2NS, 2EW … rather than lexically (which would
 * put "10NS" before "2NS", and "EW" before "NS"). Returns [tableNumber,
 * directionRank]; compared tuple-wise.
 */
function seatSortKey(seat: string): [number, number] {
  const rest = seat.replace(/^[^0-9]+/, ""); // drop the section letter(s)
  const digits = rest.match(/^\d+/)?.[0] ?? "";
  const table = digits ? Number(digits) : Number.MAX_SAFE_INTEGER;
  const direction = rest.slice(digits.length);
  const directionRank = direction === "NS" ? 0 : direction === "EW" ? 1 : 2;
  return [table, directionRank];
}

/**
 * Group roster entries by their seat's section, ordering the groups by section
 * letter and the seats WITHIN each group by seat (table number then direction).
 * The roster arrives sorted attention-first, which reads as scrambled once the
 * seats are shown as per-seat containers, so we re-sort to natural seat order
 * here. (Any status-based emphasis is carried by the per-row badge, not the
 * order.)
 */
function groupBySection(roster: RosterEntry[]): SectionGroup[] {
  const bySection = new Map<string, RosterEntry[]>();
  for (const entry of roster) {
    const key = sectionOf(entry.seat);
    const list = bySection.get(key);
    if (list) {
      list.push(entry);
    } else {
      bySection.set(key, [entry]);
    }
  }
  return [...bySection.entries()]
    .map(([section, entries]) => ({
      section,
      entries: [...entries].sort((a, b) => {
        const [ta, da] = seatSortKey(a.seat);
        const [tb, db] = seatSortKey(b.seat);
        return ta - tb || da - db;
      }),
    }))
    .sort((a, b) => a.section.localeCompare(b.section));
}

/**
 * A labelled container holding one section's pairs. Mirrors the grey section
 * card on the table-setup screen. The header is hidden for a single-section
 * game (there is nothing to disambiguate).
 */
function SectionContainer({
  section,
  entries,
  showHeader,
  isPairs,
  openSeat,
  onToggleSeat,
  onSaveSubstitution,
  onSetAbsenceTreatment,
  onWithdraw,
  renderReinstatePanel,
  renderMoveDevicePanel,
}: {
  section: string;
  entries: RosterEntry[];
  showHeader: boolean;
  isPairs: boolean;
  openSeat: string | null;
  onToggleSeat: (seat: string) => void;
} & PairsRosterActions) {
  const body = (
    <ul className="flex flex-col gap-3">
      {entries.map((entry) => (
        <SeatContainer
          key={entry.seat}
          entry={entry}
          isPairs={isPairs}
          open={openSeat === entry.seat}
          onToggle={() => onToggleSeat(entry.seat)}
          onSaveSubstitution={onSaveSubstitution}
          onSetAbsenceTreatment={onSetAbsenceTreatment}
          onWithdraw={onWithdraw}
          renderReinstatePanel={renderReinstatePanel}
          renderMoveDevicePanel={renderMoveDevicePanel}
        />
      ))}
    </ul>
  );

  if (!showHeader) {
    return body;
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <h2 className="border-b border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
        Section {section}
      </h2>
      <div className="p-3">{body}</div>
    </section>
  );
}

/**
 * The within-section seat label of a section-qualified seat ("A1NS" → "1NS"):
 * the seat with its leading section letter(s) stripped. Shown as the per-seat
 * container heading, since the section is already named by the enclosing card.
 */
function seatLabel(seat: string): string {
  return seat.replace(/^[^0-9]+/, "") || seat;
}

/**
 * A container for a single seat, headed by its within-section label ("1NS"),
 * holding the pair(s) that sat there. Almost always one pair; a §2.4.7
 * substitution seat holds two (both surfaced inside the expanded row). Grouping
 * by seat keeps a substituted seat's two occupants visually together and makes
 * the seat the stable unit of the roster.
 */
function SeatContainer({
  entry,
  isPairs,
  open,
  onToggle,
  onSaveSubstitution,
  onSetAbsenceTreatment,
  onWithdraw,
  renderReinstatePanel,
  renderMoveDevicePanel,
}: {
  entry: RosterEntry;
  isPairs: boolean;
  open: boolean;
  onToggle: () => void;
} & PairsRosterActions) {
  const badge = STATUS_BADGE[entry.status];
  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Seat label + status badge sit together on the top strip, so the seat
          number and its state read at a glance before the row is opened. */}
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          {seatLabel(entry.seat)}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
      <RosterRow
        entry={entry}
        isPairs={isPairs}
        open={open}
        onToggle={onToggle}
        onSaveSubstitution={onSaveSubstitution}
        onSetAbsenceTreatment={onSetAbsenceTreatment}
        onWithdraw={onWithdraw}
        renderReinstatePanel={renderReinstatePanel}
        renderMoveDevicePanel={renderMoveDevicePanel}
      />
    </li>
  );
}

/**
 * Section selector for the roster: an "All" pill plus one per section, in the
 * same tab-pill style as the table-setup screen's {@link SectionPills}. The
 * director picks which section's container to show (or All).
 */
function RosterSectionPills({
  sections,
  selected,
  onSelect,
}: {
  sections: string[];
  selected: string;
  onSelect: (section: string) => void;
}) {
  const pillBase =
    "rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2";
  const options = [ALL_SECTIONS, ...sections];
  return (
    <div
      role="tablist"
      aria-label="Section"
      className="flex w-full flex-wrap gap-2"
    >
      {options.map((value) => {
        const active = value === selected;
        return (
          <button
            key={value}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(value)}
            className={`${pillBase} ${
              active
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {value === ALL_SECTIONS ? "All" : `Section ${value}`}
          </button>
        );
      })}
    </div>
  );
}

/** A one-line summary of what a non-active status means, for the collapsed row. */
function statusDetail(entry: RosterEntry): string | null {
  if (entry.absence) return absenceSummary(entry.absence);
  if (entry.status === "SUBSTITUTED")
    return "A pair took over part-way through";
  if (entry.status === "WITHOUT_STANDING") return "Plays but is not ranked";
  return null;
}

/** One roster row: a tappable header, and (when open) the pair's actions. */
function RosterRow({
  entry,
  isPairs,
  open,
  onToggle,
  onSaveSubstitution,
  onSetAbsenceTreatment,
  onWithdraw,
  renderReinstatePanel,
  renderMoveDevicePanel,
}: {
  entry: RosterEntry;
  isPairs: boolean;
  open: boolean;
  onToggle: () => void;
} & PairsRosterActions) {
  const detail = statusDetail(entry);
  // A substituted seat had two pairs, so the header names BOTH (the card below
  // then only needs the Split + per-pair controls, not a repeated name line).
  const names = entry.substitution
    ? entry.substitution.occupants.map((o) => o.pair)
    : null;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div>
          {names ? (
            <div className="text-sm font-semibold text-gray-800">
              {names.map((name, i) => (
                <div key={i}>{name}</div>
              ))}
            </div>
          ) : (
            <div className="text-sm font-semibold text-gray-800">
              {entry.pair ?? "Seat not filled"}
            </div>
          )}
          {detail && <div className="text-xs text-gray-500">{detail}</div>}
        </div>
        {/* A subtle chevron signals the row expands to reveal its actions;
            it rotates to point up once open. The status badge now lives on the
            seat's top strip (see SeatContainer). */}
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-gray-200 p-3">
          <RosterRowActions
            entry={entry}
            isPairs={isPairs}
            onSaveSubstitution={onSaveSubstitution}
            onSetAbsenceTreatment={onSetAbsenceTreatment}
            onWithdraw={onWithdraw}
            renderReinstatePanel={renderReinstatePanel}
            renderMoveDevicePanel={renderMoveDevicePanel}
          />
        </div>
      )}
    </div>
  );
}

/** The actions available for one pair, by its status. */
function RosterRowActions({
  entry,
  isPairs,
  onSaveSubstitution,
  onSetAbsenceTreatment,
  onWithdraw,
  renderReinstatePanel,
  renderMoveDevicePanel,
}: { entry: RosterEntry; isPairs: boolean } & PairsRosterActions) {
  if (entry.substitution) {
    return (
      <SubstitutionCard
        row={entry.substitution}
        isPairs={isPairs}
        onSave={onSaveSubstitution}
      />
    );
  }
  if (entry.status === "WITHDRAWN") {
    return (
      <div className="flex flex-col gap-3">
        {entry.absence && (
          <AbsenceChoice
            row={entry.absence}
            onSetTreatment={onSetAbsenceTreatment}
          />
        )}
        <ReinstatePanel
          seat={entry.seat}
          renderReinstatePanel={renderReinstatePanel}
        />
      </div>
    );
  }
  if (entry.status === "LATE" || entry.status === "NOT_ARRIVED") {
    // A late pair that has arrived is seated on a device, so it can be moved;
    // one that has not arrived has no device to lose.
    const canMove = entry.status === "LATE" && renderMoveDevicePanel;
    if (!entry.absence && !canMove) return null;
    return (
      <div className="flex flex-col gap-3">
        {entry.absence && (
          <AbsenceChoice
            row={entry.absence}
            onSetTreatment={onSetAbsenceTreatment}
          />
        )}
        {canMove && (
          <MoveDevicePanel
            seat={entry.seat}
            renderMoveDevicePanel={renderMoveDevicePanel}
          />
        )}
      </div>
    );
  }
  // ACTIVE / WITHOUT_STANDING: offer a director withdrawal, and a move to a new
  // device for a pair whose device has died.
  return (
    <div className="flex flex-col gap-3">
      {renderMoveDevicePanel && (
        <MoveDevicePanel
          seat={entry.seat}
          renderMoveDevicePanel={renderMoveDevicePanel}
        />
      )}
      <WithdrawButton seat={entry.seat} onWithdraw={onWithdraw} />
    </div>
  );
}

/** A director "Withdraw this pair" button with a confirm + error surface. */
function WithdrawButton({
  seat,
  onWithdraw,
}: {
  seat: string;
  onWithdraw: (seat: string) => Promise<void>;
}) {
  return (
    <ConfirmAction
      label="Withdraw this pair"
      confirm="Withdraw? They won't play any more boards from the round they're on."
      danger
      run={() => onWithdraw(seat)}
    />
  );
}

/**
 * "Reinstate on a device": tapping reveals the seat-transfer code panel (a
 * REINSTATE code). The returning pair's device claims it, which reinstates the
 * pair with that device's fresh token — there is no server-side undo, so the
 * token never lingers.
 */
function ReinstatePanel({
  seat,
  renderReinstatePanel,
}: {
  seat: string;
  renderReinstatePanel: (seat: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-blue-600 bg-blue-600 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Reinstate on a device
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-700">
        On the returning pair&rsquo;s device, enter this code to bring them back
        in.
      </p>
      {renderReinstatePanel(seat)}
    </div>
  );
}

/**
 * "Move to a new device": for a pair whose device has died (they cannot start
 * "Change device" themselves). Tapping reveals a code, minted by the director,
 * that the pair enters on their new device. Claiming it moves the seat to that
 * device and signs the old one out; the pair's standing and boards are untouched
 * (unlike withdraw + reinstate, nothing is marked as missed).
 */
function MoveDevicePanel({
  seat,
  renderMoveDevicePanel,
}: {
  seat: string;
  renderMoveDevicePanel: (seat: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Move to a new device
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-700">
        Device lost or broken? Give this code to the pair to enter on their new
        device.
      </p>
      {renderMoveDevicePanel(seat)}
    </div>
  );
}
/** A button that asks for confirmation, runs an async action, and shows errors. */
function ConfirmAction({
  label,
  confirm,
  danger = false,
  run,
}: {
  label: string;
  confirm: string;
  danger?: boolean;
  run: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      await run();
      setConfirming(false);
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not do that. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const primary = danger
    ? "border-red-600 bg-red-600 hover:bg-red-700 focus-visible:ring-red-500"
    : "border-blue-600 bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500";

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`w-full rounded-lg border py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${primary}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-gray-700">{confirm}</p>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="flex-1 rounded-lg border border-gray-200 bg-white py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => void go()}
          disabled={busy}
          className={`flex-1 rounded-lg border py-2 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 ${primary}`}
        >
          {busy ? "Working..." : "Confirm"}
        </button>
      </div>
    </div>
  );
}

/** "Arrived in round 3 — 4 boards missed" etc. */
function absenceSummary(row: AbsentPair): string {
  const boards = `${row.missedBoards} ${row.missedBoards === 1 ? "board" : "boards"}`;
  switch (row.kind) {
    case "LATE":
      return `Arrived in round ${row.round} — ${boards} missed`;
    case "WITHDRAWN":
      return `Withdrew in round ${row.round} — ${boards} not played`;
    case "EMPTY":
      return `Not arrived yet — ${boards} unplayed`;
  }
}

/**
 * The AVE−/AVE+ vs Removed choice for a late / withdrawn pair's missed boards.
 * Saves as soon as it is changed, and reverts if the save fails.
 */
function AbsenceChoice({
  row,
  onSetTreatment,
}: {
  row: AbsentPair;
  onSetTreatment: (seat: string, treatment: AbsenceTreatment) => Promise<void>;
}) {
  const [treatment, setTreatment] = useState<AbsenceTreatment>(row.treatment);
  const [error, setError] = useState<string | null>(null);
  const seatSlug = row.seat.replace(/\W+/g, "-");

  async function change(next: AbsenceTreatment) {
    const previous = treatment;
    setTreatment(next);
    setError(null);
    try {
      await onSetTreatment(row.seat, next);
    } catch (err) {
      setTreatment(previous);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not save. Please try again.",
      );
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium text-gray-700">Missed boards</span>
      <PillToggle<AbsenceTreatment>
        name={`absence-${seatSlug}`}
        legend={`Missed boards for ${row.pair ?? row.seat}`}
        options={[
          { value: "AVERAGE", label: "AVE− / AVE+" },
          { value: "REMOVED", label: "Remove" },
        ]}
        value={treatment}
        onChange={(v) => void change(v)}
      />
      <span className="text-xs text-gray-500">
        {treatment === "AVERAGE"
          ? row.pair
            ? "This pair gets AVE− and its opponents AVE+ on each missed board."
            : "Its opponents get AVE+ on each board they can't play."
          : "The boards are taken out of the movement; its opponents are scored as if they sat out."}
      </span>
      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** A substitution seat's full settings, persisted as one unit on any change. */
interface SubSettings {
  /** One merged line (false) or two separate lines (true). */
  split: boolean;
  /** The main-pair occupancy id (merged-line identity; used only when !split). */
  mainId: number;
  /** Per-occupant eligibility for the local ranking, keyed by occupancy id. */
  eligibility: Record<number, boolean>;
}

function SubstitutionCard({
  row,
  isPairs,
  onSave,
}: {
  row: SubstitutionSeat;
  isPairs: boolean;
  onSave: PairsRosterActions["onSaveSubstitution"];
}) {
  // The anchor + default main pair (the stored main pair, else the arrival
  // anchor). Used to seed the merged-line identity.
  const anchor =
    row.occupants.find((o) => o.isArrivalAnchor) ?? row.occupants[0];
  const defaultMainId = (row.occupants.find((o) => o.isMainPair) ?? anchor).id;

  // The whole seat's current settings in one object, so a single commit can
  // persist any change. Pre-filled from the stored seat state.
  const [settings, setSettings] = useState<SubSettings>(() => ({
    split: row.split,
    mainId: defaultMainId,
    eligibility: Object.fromEntries(
      row.occupants.map((o) => [o.id, o.eligible]),
    ),
  }));
  const [error, setError] = useState<string | null>(null);

  const seatSlug = row.seat.replace(/\W+/g, "-");
  const { split, mainId, eligibility } = settings;
  const mainOccupant = row.occupants.find((o) => o.id === mainId) ?? anchor;
  // The folded-in "(Sub)" pair on a merged line — the occupant that is NOT the
  // main pair. It reacts live to the Main pair pick.
  const subOccupant = row.occupants.find((o) => o.id !== mainOccupant.id);

  // Auto-save: apply the change locally for an instant response, persist the
  // whole settings object, and roll back (restoring the previous state) if the
  // save fails — mirroring AbsenceChoice's save-on-change behaviour.
  async function commit(next: SubSettings) {
    const previous = settings;
    setSettings(next);
    setError(null);
    try {
      const main = row.occupants.find((o) => o.id === next.mainId) ?? anchor;
      // Each pair carries its own eligibility (its own toggle), whether the
      // seat is split or merged — so a stand-in can be marked without-standing
      // independently of the main pair (the common §2.4.9 case).
      const resolved: OccupantEligibilityInput[] = row.occupants.map((o) => ({
        id: o.id,
        eligible: next.eligibility[o.id],
      }));
      await onSave(row.seat, {
        split: next.split,
        eligibility: resolved,
        // The main-pair choice only applies to a merged (one-line) seat.
        ...(next.split ? {} : { mainOccupancyId: main.id }),
      });
    } catch (err) {
      setSettings(previous);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Could not save. Please try again.",
      );
    }
  }

  const setSplit = (v: boolean) => void commit({ ...settings, split: v });
  const selectMain = (id: number) => void commit({ ...settings, mainId: id });
  const setOccupantEligible = (id: number, eligible: boolean) =>
    void commit({
      ...settings,
      eligibility: { ...settings.eligibility, [id]: eligible },
    });

  return (
    <div className="flex flex-col gap-3">
      {/* Split is a per-SEAT choice, so it sits above the two pairs: one merged
          line (the pairs share a line, with a Main pair) vs two separate lines
          (each pair ranked on its own boards). */}
      <div className="flex items-center justify-between gap-3">
        <span
          id={`split-label-${seatSlug}`}
          className="text-sm font-medium text-gray-700"
        >
          Split by board?
        </span>
        <Toggle
          value={split}
          onChange={setSplit}
          offLabel="One line"
          onLabel="Two lines"
          labelledBy={`split-label-${seatSlug}`}
        />
      </div>

      {/*
       * Sits directly under the Split toggle, since it explains a consequence
       * of the merged-line (split=off) choice: the folded-in "(Sub)" pair gets
       * no NGS / Masterpoint credit — it all lands on the main pair. Only a
       * PAIRS event assigns per-pair NGS/Masterpoint, so this warning is
       * pairs-only; it names the live main / sub pick so it updates as the
       * director re-picks.
       */}
      {!split && isPairs && subOccupant && (
        <p
          role="note"
          className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          One shared line: <strong>{subOccupant.pair}</strong> gets no
          NGS/Masterpoint credit — it all goes to{" "}
          <strong>{mainOccupant.pair}</strong>.
        </p>
      )}

      {/* Both pairs that sat this seat — the original and the later pair — each
          with its Main-pair pick (merged line only) and its eligibility. */}
      <div className="flex flex-col gap-2">
        {row.occupants.map((o) => {
          const isMain = !split && o.id === mainOccupant.id;
          return (
            <div
              key={o.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-200 p-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800">
                  {o.pair}
                  <span className="ml-1 font-normal text-gray-500">
                    — {boardCountLabel(o.boardCount)}
                  </span>
                </div>
                {isMain && (
                  <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                    Main
                  </span>
                )}
              </div>

              {/* Main pair: a merged line has exactly one, so this is a
                  mutually-exclusive radio (picking one unselects the other).
                  Hidden when split (each pair is its own line, no "main"). */}
              {!split && (
                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-700">Main pair</span>
                  <input
                    type="radio"
                    name={`main-pair-${seatSlug}`}
                    className="h-4 w-4 cursor-pointer accent-indigo-600"
                    checked={o.id === mainOccupant.id}
                    onChange={() => selectMain(o.id)}
                    aria-label={`Make ${o.pair} the main pair`}
                  />
                </label>
              )}

              <div className="flex items-center justify-between gap-3">
                <span
                  id={`elig-label-${seatSlug}-${o.id}`}
                  className="text-sm text-gray-700"
                >
                  Eligible for local ranking?
                </span>
                <Toggle
                  value={eligibility[o.id]}
                  onChange={(v) => setOccupantEligible(o.id, v)}
                  offLabel="No"
                  onLabel="Yes"
                  labelledBy={`elig-label-${seatSlug}-${o.id}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/** "N board(s)" for an occupant's board count. */
function boardCountLabel(count: number): string {
  return `${count} ${count === 1 ? "board" : "boards"}`;
}
