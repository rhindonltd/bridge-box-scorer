"use client";

import { NewPlayer } from "@/db/games/shared/tables/players";
import { useEffect, useState } from "react";
import { PlayerSearchView } from "./PlayerSearchView";

interface Props {
  label: string;
  value: NewPlayer | null;
  onChange: (player: NewPlayer | null) => void;
}

export default function PlayerSearch({ label, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<NewPlayer[]>([]);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
      const players = await response.json();
      setResults(players);
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
        setResults([]);
      }}
      onClear={() => onChange(null)}
    />
  );
}
