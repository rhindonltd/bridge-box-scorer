"use client";

import { NewPlayer } from "@/db/games/tables/players";
import { useEffect, useMemo, useState } from "react";
import { PlayerSearchView } from "./PlayerSearchView";

interface Props {
  label: string;
  value: NewPlayer | null;
  onChange: (player: NewPlayer | null) => void;
}

export default function PlayerSearch({ label, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [rawResults, setRawResults] = useState<NewPlayer[]>([]);

  // Derive displayed results: only show when query is long enough
  const results = useMemo(
    () => (query.length < 2 ? [] : rawResults),
    [query, rawResults],
  );

  useEffect(() => {
    if (query.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const response = await fetch(
        `/api/players/search?q=${encodeURIComponent(query)}`,
      );
      const players = await response.json();
      setRawResults(players);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <PlayerSearchView
      label={label}
      value={value}
      query={query}
      results={results}
      loading={loading}
      onQueryChange={setQuery}
      onPlayerSelected={(player) => {
        onChange(player);
        setQuery("");
        setRawResults([]);
      }}
      onClear={() => onChange(null)}
    />
  );
}
