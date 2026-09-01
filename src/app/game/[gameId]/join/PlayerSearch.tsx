"use client";

import { NewPlayer } from "@/db/games/tables/players";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { PlayerSearchView } from "@/app/game/[gameId]/join/PlayerSearchView";
import { fetcher } from "@/lib/fetcher";
import { swrKeys } from "@/swr/swr-keys";

interface Props {
  label: string;
  value: NewPlayer | null;
  onChange: (player: NewPlayer | null) => void;
}

export default function PlayerSearch({ label, value, onChange }: Props) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the query so we only fetch after the user pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Only search once the (debounced) query is long enough.
  const shouldSearch = debouncedQuery.length >= 2;

  const { data, isLoading } = useSWR<NewPlayer[]>(
    shouldSearch ? swrKeys.playerSearch(debouncedQuery) : null,
    fetcher,
  );

  // Only show results once the live query is long enough, mirroring the
  // previous behaviour where clearing the box hid results immediately.
  const results = query.length < 2 ? [] : (data ?? []);

  return (
    <PlayerSearchView
      label={label}
      value={value}
      query={query}
      results={results}
      loading={shouldSearch && isLoading}
      onQueryChange={setQuery}
      onPlayerSelected={(player) => {
        onChange(player);
        setQuery("");
        setDebouncedQuery("");
      }}
      onClear={() => onChange(null)}
    />
  );
}
