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
  onEvict: (seat: Seat) => void;
  canRemoveTable: boolean;
}

function EvictablePlayerCard({
  label,
  player,
  seat,
  onEvict,
  stationary = false,
}: {
  label: string;
  player: Omit<Player, "id"> | null;
  seat: Seat | null;
  onEvict: (seat: Seat) => void;
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
      {player && seat && (
        <button
          onClick={() => onEvict(seat)}
          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center hover:bg-red-700 transition"
          aria-label={`Evict ${label} player`}
          title="Evict player"
        >
          &times;
        </button>
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

export default function DirectorTableControls({ tables, onEvict }: Props) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {tables.map((table) => (
            <div
              key={table.tableNumber}
              className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-200"
            >
              <div className="p-4 sm:p-6">
                <TableCompassLayout
                  north={
                    <EvictablePlayerCard
                      label="North"
                      player={table.players.N}
                      seat={table.seats.N}
                      onEvict={onEvict}
                      stationary={table.stationary?.N}
                    />
                  }
                  south={
                    <EvictablePlayerCard
                      label="South"
                      player={table.players.S}
                      seat={table.seats.S}
                      onEvict={onEvict}
                      stationary={table.stationary?.S}
                    />
                  }
                  east={
                    <EvictablePlayerCard
                      label="East"
                      player={table.players.E}
                      seat={table.seats.E}
                      onEvict={onEvict}
                      stationary={table.stationary?.E}
                    />
                  }
                  west={
                    <EvictablePlayerCard
                      label="West"
                      player={table.players.W}
                      seat={table.seats.W}
                      onEvict={onEvict}
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
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
