"use client";

import { useMemo, useState } from "react";
import type {
  SwissTeamsPreviewAck,
  TeamsMatchEntry,
  TeamsTripleEntry,
} from "@/lib/swiss-service";
import type { NamedTeam } from "@/services/swiss-teams-seating-names";
import {
  evaluateSwissTeamsRound,
  swapTeams,
  teamOpponentKey,
  type SwissTeamsRound,
  type TeamId,
} from "@/movement/swiss-teams/swiss-teams-pairing";

const primaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

const secondaryButtonClass =
  "w-full py-3.5 text-lg font-semibold bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 active:scale-[0.98] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50";

export interface SwissTeamsDrawPreviewProps {
  preview: SwissTeamsPreviewAck;
  /** True while the commit request is in flight. */
  committing: boolean;
  /** Inline error from a failed commit, if any. */
  error: string | null;
  /** Accept the (possibly edited) round. */
  onConfirm: (
    matches: TeamsMatchEntry[],
    byeTeamId: number | null,
    triple: TeamsTripleEntry | null,
  ) => void;
  onCancel: () => void;
}

/**
 * Full-screen review of a freshly-drawn Swiss Teams round before it is
 * committed. Shows each match as the two teams meeting, the sit-out (bye) team,
 * or the three-way triple, plus a repeat advisory.
 *
 * The director may hand-adjust before accepting: tap two teams to swap their
 * places this round. Wherever one sits — in a match, as the bye, or in the
 * triple — the other takes its place (and vice versa), so a single tap-tap
 * re-pairs matches, changes who sits out, or reshapes the triple. The repeat
 * advisory re-checks live on every edit (the same pure check the server ran)
 * but never blocks — the director can commit an override. OK commits exactly
 * what is shown; Cancel discards it (nothing was written).
 */
export function SwissTeamsDrawPreview({
  preview,
  committing,
  error,
  onConfirm,
  onCancel,
}: SwissTeamsDrawPreviewProps) {
  const { named } = preview;

  // The editable round as plain data. Names are resolved once from the preview
  // (they don't depend on placement), keyed by stable team id.
  const [round, setRound] = useState<SwissTeamsRound>({
    matches: preview.matches.map((m) => ({ ...m })),
    byeTeamId: preview.byeTeamId,
    triple: preview.triple ? { ...preview.triple } : null,
  });
  // The team the director has picked as the first half of a swap, or null.
  const [selected, setSelected] = useState<TeamId | null>(null);

  // Resolve team id -> display name from the preview's named seating (the
  // initial draw), which covers every team in the field.
  const nameById = useMemo(() => {
    const map = new Map<TeamId, string>();
    const add = (t: NamedTeam) => map.set(t.teamId, t.name);
    for (const m of named.matches) {
      add(m.a);
      add(m.b);
    }
    if (named.bye) add(named.bye);
    if (named.triple) {
      add(named.triple.a);
      add(named.triple.b);
      add(named.triple.c);
    }
    return map;
  }, [named]);
  const teamName = (id: TeamId): string => nameById.get(id) ?? `Team ${id}`;

  // Running VP total per team, from the standings the draw ranked on — shown
  // inline next to each team so there's no separate standings list.
  const totalById = useMemo(
    () => new Map(preview.standings.map((s) => [s.id, s.total])),
    [preview.standings],
  );
  const totalFor = (teamId: TeamId): number | null =>
    totalById.get(teamId) ?? null;

  // Re-evaluate the repeat advisory on every edit. Pure and identical to the
  // server's check; drives both the warning and the per-match highlight.
  const advisories = useMemo(
    () => evaluateSwissTeamsRound(round, preview.advisoryInputs),
    [round, preview.advisoryInputs],
  );
  const repeatKeys = useMemo(
    () => new Set(advisories.repeats),
    [advisories.repeats],
  );

  function pick(teamId: TeamId) {
    if (selected == null) {
      setSelected(teamId);
      return;
    }
    if (selected === teamId) {
      setSelected(null);
      return;
    }
    // Second pick: swap the two teams' places in the round.
    setRound((r) => swapTeams(r, selected, teamId));
    setSelected(null);
  }

  return (
    <div
      className="flex h-full min-h-0 flex-col"
      data-testid="swiss-teams-draw-preview"
    >
      <div className="shrink-0 border-b border-gray-200 bg-gray-100 px-4 py-3 text-center font-semibold text-gray-800">
        Round {preview.roundNumber} — review draw
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pb-4 pt-4">
          <p className="mb-3 text-sm text-gray-600">
            Review the team matches for round {preview.roundNumber}. Tap two
            teams to swap their places
            {round.byeTeamId != null
              ? " (including the team sitting out)"
              : round.triple != null
                ? " (including the three-way)"
                : ""}
            . Each match is played in two rooms — the away pairs travel to their
            opponents. Each team shows its current total (the order the draw
            ranks on). Nothing is saved until you tap OK.
          </p>

          {advisories.hadUnavoidableRepeat && (
            <div
              className="mb-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
              role="status"
              data-testid="draw-advisories"
            >
              A match repeats an earlier-round opponent. You can swap teams to
              avoid it or accept it as shown.
            </div>
          )}

          <div className="flex flex-col gap-3">
            {round.matches.map((m) => {
              const isRepeat = repeatKeys.has(teamOpponentKey(m.a, m.b));
              return (
                <div
                  key={`${m.a}-${m.b}`}
                  data-testid="teams-match"
                  data-problem={isRepeat ? "true" : undefined}
                  className={`rounded-xl border bg-white p-3 shadow-sm ${
                    isRepeat
                      ? "border-amber-400 ring-2 ring-amber-400"
                      : "border-gray-200"
                  }`}
                >
                  {isRepeat && (
                    <div className="mb-1 text-right">
                      <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                        Repeat — check this match
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3">
                    <TeamChip
                      teamId={m.a}
                      name={teamName(m.a)}
                      total={totalFor(m.a)}
                      selected={selected === m.a}
                      onClick={() => pick(m.a)}
                    />
                    <span className="shrink-0 text-sm text-gray-400">v</span>
                    <TeamChip
                      teamId={m.b}
                      name={teamName(m.b)}
                      total={totalFor(m.b)}
                      selected={selected === m.b}
                      onClick={() => pick(m.b)}
                      alignRight
                    />
                  </div>
                </div>
              );
            })}

            {round.triple && (
              <div
                className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm"
                data-testid="teams-triple"
              >
                <div className="mb-1 text-sm font-semibold text-gray-500">
                  {round.triple.kind === "LONG"
                    ? "Three-way (long triple — over two rounds)"
                    : "Three-way (short triple)"}
                </div>
                <p className="mb-2 text-xs text-gray-500">
                  Three teams play a round-robin of three head-to-head
                  comparisons
                  {round.triple.kind === "LONG"
                    ? " on full boards, spread across this round and the next."
                    : ", each on its own board set within this round."}{" "}
                  Tap a team to swap it.
                </p>
                <div className="flex flex-col gap-1">
                  {(
                    [
                      [round.triple.a, round.triple.b],
                      [round.triple.b, round.triple.c],
                      [round.triple.a, round.triple.c],
                    ] as [TeamId, TeamId][]
                  ).map(([x, y]) => (
                    <div
                      key={`${x}-${y}`}
                      data-testid="teams-triple-comparison"
                      className="flex items-center justify-between gap-3"
                    >
                      <TeamChip
                        teamId={x}
                        name={teamName(x)}
                        total={totalFor(x)}
                        selected={selected === x}
                        onClick={() => pick(x)}
                      />
                      <span className="shrink-0 text-sm text-gray-400">v</span>
                      <TeamChip
                        teamId={y}
                        name={teamName(y)}
                        total={totalFor(y)}
                        selected={selected === y}
                        onClick={() => pick(y)}
                        alignRight
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {round.byeTeamId != null && (
              <div
                className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-3"
                data-testid="teams-bye"
              >
                <div className="mb-1 text-sm font-semibold text-gray-500">
                  Sitting out (bye)
                </div>
                <TeamChip
                  teamId={round.byeTeamId}
                  name={teamName(round.byeTeamId)}
                  total={totalFor(round.byeTeamId)}
                  selected={selected === round.byeTeamId}
                  onClick={() => pick(round.byeTeamId!)}
                />
              </div>
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
            onClick={() =>
              onConfirm(round.matches, round.byeTeamId, round.triple)
            }
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

/**
 * A tappable team with its name and current VP total (e.g. "Sharks — 34.00
 * VP"). Tapping selects it for a swap; tapping a second team swaps their places.
 * The total is omitted when the team has no leaderboard line yet.
 */
function TeamChip({
  teamId,
  name,
  total,
  selected,
  onClick,
  alignRight = false,
}: {
  teamId: TeamId;
  name: string;
  total: number | null;
  selected: boolean;
  onClick: () => void;
  alignRight?: boolean;
}) {
  void teamId;
  const base =
    "flex items-baseline gap-2 rounded-lg border px-2 py-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";
  const stateClasses = selected
    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-400"
    : "border-gray-200 bg-gray-50 hover:bg-gray-100";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`${base} ${stateClasses} ${alignRight ? "flex-row-reverse text-right" : ""}`}
    >
      <span className="text-base font-semibold text-gray-800">{name}</span>
      {total != null && (
        <span className="text-xs font-medium text-gray-600 tabular-nums">
          {total.toFixed(2)} VP
        </span>
      )}
    </button>
  );
}
