"use client";

import { GamePageLayout } from "@/components/layout/GamePageLayout";
import { CaptionedSpinner } from "@/components/common/Spinner";
import { BoardResult as ContractDisplay } from "@/components/traveller/BoardResult";
import { BoardInstance, TeamTravellerMatch } from "@/model/participants";
import { BoardOutcome } from "@/model/score";
import { Deal } from "@/model/common";
import { ShowHandToggle } from "@/components/deal/ShowHandToggle";

interface TravellerViewProps {
  boardNumber: number;
  instances: BoardInstance[];
  /** The board's deal, shown behind a "Show hand" toggle when present. */
  deal?: Deal | null;
  /**
   * Team-match framing for a teams game (open/closed rooms + team names + IMP
   * margin). When present and non-empty, the traveller is grouped into
   * team-vs-team cards; otherwise it renders as the plain pairs table. Defaults
   * to none (pairs).
   */
  teamMatches?: TeamTravellerMatch[];
  isLoading: boolean;
  onLineSelected: (instance: BoardInstance) => void;
  onBack: () => void;
}

/**
 * Traveller — shows a board's traveller as a tappable table.
 *
 * Pairs games render a flat NS/EW table (one row per table). A teams game
 * (when `teamMatches` framing is supplied) renders one card per team match: the
 * two rooms (open at the home team's table, closed at the opponent's) shown as
 * the two teams by name with each room's contract and the board's IMP margin; a
 * three-way triangle shows its three rooms. Either way, every physical table
 * row stays independently tappable and selects that line for correction.
 */
export function Traveller({
  boardNumber,
  instances,
  deal = null,
  teamMatches = [],
  isLoading,
  onLineSelected,
  onBack,
}: TravellerViewProps) {
  if (isLoading) {
    return (
      <GamePageLayout
        headerTitle={`Traveller - Board ${boardNumber}`}
        backAction={onBack}
        contentMode="fill"
      >
        <CaptionedSpinner caption="Loading..." />
      </GamePageLayout>
    );
  }

  const isTeams = teamMatches.length > 0;

  return (
    <GamePageLayout
      headerTitle={`Traveller - Board ${boardNumber}`}
      backAction={onBack}
    >
      <div className="flex h-full flex-col p-4">
        <ShowHandToggle boardNumber={boardNumber} deal={deal} />

        {instances.length === 0 && (
          <div className="flex flex-1 items-center justify-center text-center text-gray-500">
            No results for this board yet
          </div>
        )}

        {instances.length > 0 && (
          <>
            <div className="mb-2 font-bold">Tap a row to adjust the result</div>

            {isTeams ? (
              <TeamMatchList
                matches={teamMatches}
                instances={instances}
                onLineSelected={onLineSelected}
              />
            ) : (
              <PairTravellerTable
                instances={instances}
                onLineSelected={onLineSelected}
              />
            )}
          </>
        )}
      </div>
    </GamePageLayout>
  );
}

/** The plain pairs traveller: one selectable NS/EW row per table. */
function PairTravellerTable({
  instances,
  onLineSelected,
}: {
  instances: BoardInstance[];
  onLineSelected: (instance: BoardInstance) => void;
}) {
  return (
    <div className="border rounded-lg shadow-sm overflow-x-auto">
      <table className="w-full table-auto border-collapse text-center text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1.5">NS</th>
            <th className="border px-2 py-1.5">EW</th>
            <th className="border px-2 py-1.5">Contract</th>
          </tr>
        </thead>
        <tbody>
          {instances.map((instance) => (
            <tr
              key={`${instance.roundNumber}-${instance.tableNumber}`}
              onClick={() => onLineSelected(instance)}
              data-testid={`traveller-row-${instance.roundNumber}-${instance.tableNumber}`}
              className="cursor-pointer hover:bg-blue-50 active:bg-blue-100 transition"
            >
              {instance.participants.type === "PAIRS" ? (
                <>
                  <td className="border px-2 py-2">
                    <div className="font-medium">
                      {instance.participants.ns}
                    </div>
                    {instance.participants.nsNames && (
                      <div className="text-xs text-gray-500">
                        {instance.participants.nsNames}
                      </div>
                    )}
                  </td>
                  <td className="border px-2 py-2">
                    <div className="font-medium">
                      {instance.participants.ew}
                    </div>
                    {instance.participants.ewNames && (
                      <div className="text-xs text-gray-500">
                        {instance.participants.ewNames}
                      </div>
                    )}
                  </td>
                </>
              ) : null}
              <td className="border px-2 py-2 font-medium">
                <ResultCell result={instance.currentResult} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The teams traveller: one card per match. Each card names the two (or three,
 * for a triangle) teams and shows one selectable room row per physical table —
 * the home team's home pair (NS) hosting the opponent's away pair. A two-team
 * match also shows the board's IMP margin from the higher-scoring team's side.
 */
function TeamMatchList({
  matches,
  instances,
  onLineSelected,
}: {
  matches: TeamTravellerMatch[];
  instances: BoardInstance[];
  onLineSelected: (instance: BoardInstance) => void;
}) {
  // Index the flat per-table instances so each match card can find its rooms.
  const byTable = new Map<number, BoardInstance>();
  for (const inst of instances) byTable.set(inst.tableNumber, inst);

  return (
    <div className="flex flex-col gap-3">
      {matches.map((match) => {
        const nameByTable = new Map(match.teams.map((t) => [t.table, t.name]));
        return (
          <div
            key={match.tables.join("-")}
            data-testid={`teams-match-${match.tables.join("-")}`}
            className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between gap-2 border-b border-gray-200 bg-gray-100 px-3 py-2">
              <span className="text-sm font-semibold text-gray-700">
                {match.triangle
                  ? "Three-way"
                  : match.teams.map((t) => t.name).join(" v ")}
              </span>
              {!match.triangle && match.margin != null && (
                <span className="text-xs font-medium text-gray-600 tabular-nums">
                  {match.margin === 0
                    ? "Tied"
                    : `+${Math.abs(match.margin)} IMP`}
                </span>
              )}
            </div>

            <table className="w-full table-auto border-collapse text-center text-sm">
              <tbody>
                {match.tables.map((table) => {
                  const inst = byTable.get(table);
                  if (!inst) return null;
                  // The team hosting this room (its home pair sits NS here).
                  const hostName = nameByTable.get(table) ?? `Table ${table}`;
                  return (
                    <tr
                      key={`${inst.roundNumber}-${inst.tableNumber}`}
                      onClick={() => onLineSelected(inst)}
                      data-testid={`traveller-row-${inst.roundNumber}-${inst.tableNumber}`}
                      className="cursor-pointer border-b border-gray-200 transition last:border-b-0 hover:bg-blue-50 active:bg-blue-100"
                    >
                      <td className="px-2 py-2 text-left">
                        <div className="font-medium">{hostName}</div>
                        <div className="text-xs text-gray-500">
                          Table {table}
                        </div>
                      </td>
                      <td className="px-2 py-2 font-medium">
                        <ResultCell result={inst.currentResult} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

/** A board result contract, or an em-dash placeholder when not yet entered. */
function ResultCell({ result }: { result: string | null }) {
  if (!result) return <span className="text-gray-500">—</span>;
  return <ContractDisplay boardOutcome={result as BoardOutcome} />;
}
