"use client";

import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { GamePageLayout } from "@/components/layout/GamePageLayout";
import {
  RosterSectionPills,
  STATUS_BADGE,
  StandingControl,
} from "@/app/game/[gameId]/manage/pairs/PairsRosterPage";
import type { StandingChange } from "@/lib/standing-service";
import type {
  TeamRosterEntry,
  TeamRosterSeat,
} from "@/db/games/queries/find-teams-roster";

export interface TeamsRosterPageProps {
  /** Header right-hand content — the play⇄manage switch on a director device. */
  headerRight?: ReactNode;
  /** Back to the manage menu. */
  onBack: () => void;
  /** Every team with its standing and the pairs that have played for it. */
  roster: TeamRosterEntry[];
  /**
   * Change the team's EBU §2.4 standing. `seat` is the team's home NS seat (its
   * `teamId`), which is where the standing is stored and scored from. Rejects
   * with a message on failure.
   */
  onChangeStanding: (seat: string, change: StandingChange) => Promise<void>;
  /**
   * Render the "move to a new device" code panel for one of the team's seats
   * (for a pair whose device has died). Optional so a host that cannot mint one
   * omits the control.
   */
  renderMoveDevicePanel?: (seat: string) => ReactNode;
  /**
   * Each section's display name, keyed by section letter (e.g. A → "Red"). A
   * section with no entry shows its letter.
   */
  sectionLabels?: Record<string, string>;
}

/** Sentinel value for the "All sections" pill. */
const ALL_SECTIONS = "ALL";

/** A one-line summary of a non-active standing, for the collapsed row. */
function standingDetail(team: TeamRosterEntry): string | null {
  switch (team.status) {
    case "WITHDRAWN":
      return team.round != null ? `Withdrew in round ${team.round}` : null;
    case "LATE":
      return team.round != null ? `Arrived in round ${team.round}` : null;
    case "WITHOUT_STANDING":
      return "Plays but is not ranked";
    default:
      return null;
  }
}

/** Group the roster by section, ordered by section letter then team number. */
function groupBySection(
  roster: TeamRosterEntry[],
): { section: string; teams: TeamRosterEntry[] }[] {
  const bySection = new Map<string, TeamRosterEntry[]>();
  for (const team of roster) {
    const list = bySection.get(team.section) ?? [];
    list.push(team);
    bySection.set(team.section, list);
  }
  return [...bySection.entries()]
    .map(([section, teams]) => ({
      section,
      teams: [...teams].sort((a, b) => Number(a.number) - Number(b.number)),
    }))
    .sort((a, b) => a.section.localeCompare(b.section));
}

/**
 * The director's "Teams" roster: every team in a Teams or Swiss Teams game,
 * grouped by section, with its standing. Tapping a team opens its actions:
 * change its standing (Active / Withdrawn / Late / No standing, the same
 * editor the Swiss Pairs roster uses) and move a pair to a new device.
 *
 * A substitution is made by the players (a handover), so it is shown here
 * read-only: which pairs have sat each seat, and how many of the team's
 * allowed pairs have been used.
 */
export function TeamsRosterPage({
  headerRight,
  onBack,
  roster,
  onChangeStanding,
  renderMoveDevicePanel,
  sectionLabels = {},
}: TeamsRosterPageProps) {
  const [openTeam, setOpenTeam] = useState<string | null>(null);
  const [section, setSection] = useState<string>(ALL_SECTIONS);

  const groups = groupBySection(roster);
  const multiSection = groups.length > 1;
  const visible = multiSection
    ? groups.filter((g) => section === ALL_SECTIONS || g.section === section)
    : groups;

  return (
    <GamePageLayout
      headerTitle="Teams"
      contentMode="scroll"
      backAction={onBack}
      headerRight={headerRight}
    >
      <div className="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pb-8 pt-6">
        <p className="text-sm text-gray-600">
          Every team in the game. Tap a team to change its standing, for example
          if it withdraws or arrives late.
        </p>

        {multiSection && (
          <RosterSectionPills
            sections={groups.map((g) => g.section)}
            labels={sectionLabels}
            selected={section}
            onSelect={setSection}
          />
        )}

        {roster.length === 0 ? (
          <p className="text-sm text-gray-500">No teams seated yet.</p>
        ) : (
          visible.map((group) => (
            <SectionContainer
              key={group.section}
              label={sectionLabels[group.section] ?? group.section}
              teams={group.teams}
              showHeader={multiSection}
              openTeam={openTeam}
              onToggleTeam={(id) => setOpenTeam((t) => (t === id ? null : id))}
              onChangeStanding={onChangeStanding}
              renderMoveDevicePanel={renderMoveDevicePanel}
            />
          ))
        )}
      </div>
    </GamePageLayout>
  );
}

/** One section's teams, in a grey card headed by the section when there are several. */
function SectionContainer({
  label,
  teams,
  showHeader,
  openTeam,
  onToggleTeam,
  onChangeStanding,
  renderMoveDevicePanel,
}: {
  /** The section's display name. */
  label: string;
  teams: TeamRosterEntry[];
  showHeader: boolean;
  openTeam: string | null;
  onToggleTeam: (teamId: string) => void;
} & Pick<TeamsRosterPageProps, "onChangeStanding" | "renderMoveDevicePanel">) {
  const body = (
    <ul className="flex flex-col gap-3">
      {teams.map((team) => (
        <TeamContainer
          key={team.teamId}
          team={team}
          open={openTeam === team.teamId}
          onToggle={() => onToggleTeam(team.teamId)}
          onChangeStanding={onChangeStanding}
          renderMoveDevicePanel={renderMoveDevicePanel}
        />
      ))}
    </ul>
  );

  if (!showHeader) return body;

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <h2 className="border-b border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
        {label}
      </h2>
      <div className="p-3">{body}</div>
    </section>
  );
}

/** One team: a top strip (number + status), a tappable header, and its actions. */
function TeamContainer({
  team,
  open,
  onToggle,
  onChangeStanding,
  renderMoveDevicePanel,
}: {
  team: TeamRosterEntry;
  open: boolean;
  onToggle: () => void;
} & Pick<TeamsRosterPageProps, "onChangeStanding" | "renderMoveDevicePanel">) {
  const badge = STATUS_BADGE[team.status];
  const detail = standingDetail(team);

  return (
    <li className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-gray-50 px-3 py-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Team {team.number}
        </h3>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-2 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <div>
          <div className="text-sm font-semibold text-gray-800">{team.name}</div>
          {detail && <div className="text-xs text-gray-500">{detail}</div>}
        </div>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`mt-0.5 shrink-0 text-gray-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-gray-200 p-3">
          <SeatList seats={team.seats} />
          <p className="text-xs text-gray-500">
            {team.pairsUsed} of {team.maxPairs} pairs used.{" "}
            {team.pairsUsed > 2
              ? "A substitute has played for this team."
              : "Substitutes are arranged by the players."}
          </p>
          <StandingControl
            seat={team.teamId}
            label={team.name}
            status={team.status}
            onChangeStanding={onChangeStanding}
          />
          {renderMoveDevicePanel &&
            team.seats.map((seat) => (
              <SeatDevice
                key={seat.seat}
                seat={seat}
                renderMoveDevicePanel={renderMoveDevicePanel}
              />
            ))}
        </div>
      )}
    </li>
  );
}

/** Who has sat each of the team's two seats, earliest first. */
function SeatList({ seats }: { seats: TeamRosterSeat[] }) {
  return (
    <dl className="flex flex-col gap-2">
      {seats.map((seat) => (
        <div key={seat.seat}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            {seat.label}
          </dt>
          <dd className="text-sm text-gray-800">
            {seat.occupants.length === 0 ? (
              <span className="text-gray-500">Seat not filled</span>
            ) : (
              <ul>
                {seat.occupants.map((o, i) => (
                  <li key={i}>
                    {o.pair}
                    {seat.occupants.length > 1 && o.boardCount != null && (
                      <span className="text-xs text-gray-500">
                        {" "}
                        ({o.boardCount}{" "}
                        {o.boardCount === 1 ? "board" : "boards"})
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** "Move to a new device" for one of the team's seats, labelled Home / Away. */
function SeatDevice({
  seat,
  renderMoveDevicePanel,
}: {
  seat: TeamRosterSeat;
  renderMoveDevicePanel: (seat: string) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // A seat nobody has filled has no device to lose.
  if (seat.occupants.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {seat.label} pair
      </span>
      {open ? (
        renderMoveDevicePanel(seat.seat)
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 text-sm font-semibold text-gray-800 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Move {seat.label.toLowerCase()} pair to a new device
        </button>
      )}
    </div>
  );
}
