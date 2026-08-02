"use client";

import { NewPlayer } from "@/db/games/shared/tables/players";
import { Search, User, X } from "lucide-react";

export interface PlayerSearchViewProps {
  label: string;
  value: NewPlayer | null;
  query: string;
  results: NewPlayer[];
  loading: boolean;
  onQueryChange: (query: string) => void;
  onPlayerSelected: (player: NewPlayer) => void;
  onClear: () => void;
}

export function PlayerSearchView({
  label,
  value,
  query,
  results,
  loading,
  onQueryChange,
  onPlayerSelected,
  onClear,
}: PlayerSearchViewProps) {
  if (value) {
    return (
      <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-slate-900">
              {value.firstName} {value.lastName}
            </h3>
            {value.nationalId && (
              <p className="text-sm text-slate-600">EBU {value.nationalId}</p>
            )}
          </div>
          <button
            onClick={onClear}
            className="rounded-lg p-2 text-slate-500 hover:bg-white"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <label className="mb-2 block text-sm font-medium">{label}</label>

      <div className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="EBU No, Club ID or Name"
          className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
        />
      </div>

      {loading && (
        <div className="mt-2 text-sm text-slate-500">Searching...</div>
      )}

      {results.length > 0 && (
        <div className="mt-2 overflow-hidden rounded-xl border bg-white shadow-lg">
          {results.map((player, index) => (
            <button
              key={player.nationalId ?? index}
              onClick={() => onPlayerSelected(player)}
              className="flex w-full items-center gap-3 border-b p-3 text-left hover:bg-slate-50"
            >
              <User size={18} className="text-slate-400" />
              <div>
                <div className="font-medium">
                  {player.firstName} {player.lastName}
                </div>
                {player.nationalId && (
                  <div className="text-xs text-slate-500">
                    EBU {player.nationalId}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
