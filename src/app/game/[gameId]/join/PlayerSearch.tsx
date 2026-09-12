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

/**
 * Turn a free-text query into a guest player (no EBU/national id), or null when
 * it isn't usable as a name. The first whitespace splits first/last name; a
 * single word becomes the first name with an empty last name. A query that is
 * only an EBU/club number (digits) is not offered as a guest — that's a lookup,
 * not a name.
 */
export function guestFromQuery(query: string): NewPlayer | null {
  const trimmed = query.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return null;
  // Purely numeric input is an id lookup, not a guest name.
  if (/^\d+$/.test(trimmed)) return null;

  const firstSpace = trimmed.indexOf(" ");
  const firstName = firstSpace === -1 ? trimmed : trimmed.slice(0, firstSpace);
  const lastName = firstSpace === -1 ? "" : trimmed.slice(firstSpace + 1);

  return { firstName, lastName, nationalId: null };
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

  // Offer the typed text as a guest (no EBU number) so players who aren't in
  // the database can still be seated. Available as soon as there's a usable
  // name, even while the search is still loading or returns nothing.
  const guestOption = query.length < 2 ? null : guestFromQuery(query);

  const select = (player: NewPlayer) => {
    onChange(player);
    setQuery("");
    setDebouncedQuery("");
  };

  return (
    <PlayerSearchView
      label={label}
      value={value}
      query={query}
      results={results}
      guestOption={guestOption}
      loading={shouldSearch && isLoading}
      onQueryChange={setQuery}
      onPlayerSelected={select}
      onGuestSelected={select}
      onClear={() => onChange(null)}
    />
  );
}
