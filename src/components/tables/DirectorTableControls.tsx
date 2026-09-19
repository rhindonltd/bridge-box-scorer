"use client";

import React from "react";
import { Player } from "@/db/games/tables/players";
import { Seat } from "@/model/participants";
import PlayerCard from "@/components/common/PlayerCard";
import TableCompassLayout from "@/components/layout/TableCompassLayout";

interface Players {
  N: Player | null;
  S: Player | null;
  E: Player | null;
  W: Player | null;
}

export interface DirectorTable {
  tableNumber: number;
  players: Players;
  /** Seat identifiers for each occupied position (for eviction) */
  seats: {
    N: Seat | null;
    S: Seat | null;
    E: Seat | null;
    W: Seat | null;
  };
  /**
   * Which compass positions belong to a stationary pair (stay at this table for
   * the whole movement). Purely informational for the director. N/S share the
   * NS pair and E/W share the EW pair, so they are flagged together.
   */
  stationary?: {
    N: boolean;
    S: boolean;
    E: boolean;
    W: boolean;
  };
  /**
   * Board setup facts for the start of the movement (round 1): which boards to
   * place at this table, on which physical copy, and any board share/relay with
   * another table. Omitted when no movement is resolved for the section (or the
   * movement's table count doesn't match), in which case the card shows no board
   * setup guidance.
   */
  placement?: {
    boardStart: number;
    boardEnd: number;
    boardCopy?: string;
    sharesWith?: number[];
    relayWith?: number;
  };
}

interface Props {
  tables: DirectorTable[];
  /**
   * Open the per-table management dialog (evict pairs / set stationary). Tapping
   * anywhere on a table's card invokes this with that table.
   */
  onOpenTable: (table: DirectorTable) => void;
}

/**
 * A single compass position's player card, with a "Stationary" badge when the
 * position belongs to a stationary pair. Purely presentational — the evict and
 * stationary controls now live in the per-table dialog (see
 * {@link DirectorTableModal}), which opens by tapping the table card.
 */
function CompassPlayerCard({
  label,
  player,
  stationary = false,
}: {
  label: string;
  player: Omit<Player, "id"> | null;
  /** Highlight this position as stationary for the selected movement. */
  stationary?: boolean;
}) {
  return (
    <div
      className={
        stationary
          ? "relative rounded-lg ring-2 ring-amber-400 ring-offset-1"
          : "relative"
      }
    >
      <PlayerCard label={label} player={player} />
      {stationary && (
        <span
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-950"
          title="This pair stays at this table for the whole movement"
        >
          Stationary
        </span>
      )}
    </div>
  );
}

/**
 * The board setup guidance shown under a table's number: which boards to place
 * there for round 1 (with the physical copy where relevant), and any board
 * share or relay with another table. Renders nothing when the section has no
 * resolved movement for this table.
 */
function TablePlacementNote({
  placement,
}: {
  placement?: DirectorTable["placement"];
}) {
  if (!placement) return null;

  const { boardStart, boardEnd, boardCopy, sharesWith, relayWith } = placement;

  const boardsLabel =
    boardStart === boardEnd
      ? `Board ${boardStart}`
      : `Boards ${boardStart}\u2013${boardEnd}`;
  const withCopy =
    boardCopy != null ? `${boardsLabel} (Copy ${boardCopy})` : boardsLabel;

  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <div className="rounded-md bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-800">
        {withCopy}
      </div>
      {sharesWith && sharesWith.length > 0 && (
        <div className="text-[11px] font-medium text-gray-600">
          {sharesWith.length === 1
            ? `Shares with table ${sharesWith[0]}`
            : `Shares with tables ${sharesWith.join(", ")}`}
        </div>
      )}
      {relayWith != null && (
        <div className="text-[11px] font-medium text-gray-600">
          Relay {"\u2192"} table {relayWith}
        </div>
      )}
    </div>
  );
}

export default function DirectorTableControls({ tables, onOpenTable }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {tables.map((table) => (
          <button
            key={table.tableNumber}
            type="button"
            onClick={() => onOpenTable(table)}
            aria-label={`Manage table ${table.tableNumber}`}
            className="block w-full rounded-2xl border border-gray-200 bg-white text-left shadow-md transition-shadow duration-200 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="p-4 sm:p-6">
              <TableCompassLayout
                north={
                  <CompassPlayerCard
                    label="North"
                    player={table.players.N}
                    stationary={table.stationary?.N}
                  />
                }
                south={
                  <CompassPlayerCard
                    label="South"
                    player={table.players.S}
                    stationary={table.stationary?.S}
                  />
                }
                east={
                  <CompassPlayerCard
                    label="East"
                    player={table.players.E}
                    stationary={table.stationary?.E}
                  />
                }
                west={
                  <CompassPlayerCard
                    label="West"
                    player={table.players.W}
                    stationary={table.stationary?.W}
                  />
                }
                center={
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex flex-col items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg">
                      <div className="text-[10px] font-bold">Table</div>
                      <div className="text-xl font-bold">
                        {table.tableNumber}
                      </div>
                    </div>
                    <TablePlacementNote placement={table.placement} />
                  </div>
                }
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
