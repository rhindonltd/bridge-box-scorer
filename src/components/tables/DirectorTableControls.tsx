"use client";

import React from "react";
import { Player } from "@/db/games/shared/tables/players";
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
}

interface Props {
  tables: DirectorTable[];
  onAddTable: () => void;
  onRemoveTable: () => void;
  onEvict: (seat: Seat) => void;
  canRemoveTable: boolean;
}

function EvictablePlayerCard({
  label,
  player,
  seat,
  onEvict,
}: {
  label: string;
  player: Omit<Player, "id"> | null;
  seat: Seat | null;
  onEvict: (seat: Seat) => void;
}) {
  return (
    <div className="relative">
      <PlayerCard label={label} player={player} />
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

export default function DirectorTableControls({
  tables,
  onAddTable,
  onRemoveTable,
  onEvict,
  canRemoveTable,
}: Props) {
  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Add/Remove table buttons */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <button
          onClick={onRemoveTable}
          disabled={!canRemoveTable}
          className="w-10 h-10 rounded-full bg-red-500 text-white text-2xl font-bold flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-red-600 transition"
          aria-label="Remove table"
        >
          &minus;
        </button>
        <span className="text-lg font-semibold">
          {tables.length} {tables.length === 1 ? "Table" : "Tables"}
        </span>
        <button
          onClick={onAddTable}
          className="w-10 h-10 rounded-full bg-green-600 text-white text-2xl font-bold flex items-center justify-center hover:bg-green-700 transition"
          aria-label="Add table"
        >
          +
        </button>
      </div>

      {/* Table grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {tables.map((table) => (
          <div
            key={table.tableNumber}
            className="bg-white border border-gray-200 rounded-2xl shadow-md hover:shadow-xl transition-shadow duration-200"
          >
            <div className="p-6">
              <TableCompassLayout
                north={
                  <EvictablePlayerCard
                    label="North"
                    player={table.players.N}
                    seat={table.seats.N}
                    onEvict={onEvict}
                  />
                }
                south={
                  <EvictablePlayerCard
                    label="South"
                    player={table.players.S}
                    seat={table.seats.S}
                    onEvict={onEvict}
                  />
                }
                east={
                  <EvictablePlayerCard
                    label="East"
                    player={table.players.E}
                    seat={table.seats.E}
                    onEvict={onEvict}
                  />
                }
                west={
                  <EvictablePlayerCard
                    label="West"
                    player={table.players.W}
                    seat={table.seats.W}
                    onEvict={onEvict}
                  />
                }
                center={
                  <div className="flex flex-col items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg">
                    <div className="text-[10px] font-bold">Table</div>
                    <div className="text-xl font-bold">{table.tableNumber}</div>
                  </div>
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
