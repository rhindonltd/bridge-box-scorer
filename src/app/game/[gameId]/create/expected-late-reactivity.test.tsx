import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useMemo } from "react";
import useSWR, { useSWRConfig } from "swr";

/**
 * Regression guard for the "expected late doesn't update the open dialog until
 * reopened" bug (ShowTablesPage). The root cause was storing a `Set` in the SWR
 * cache: SWR's default `compare` hashes its data to decide whether to re-render
 * bound hooks, and that hash does NOT serialise Set contents — two different
 * Sets compare as equal, so an optimistic flip updated the cache WITHOUT
 * re-rendering (the open dialog stayed stale until closed and reopened).
 *
 * The fix caches a plain string[] (hashed by contents) and derives the Set in
 * the component. This test mirrors that shape with the REAL swr and asserts a
 * bound consumer re-renders on an optimistic flip — so nobody "simplifies" the
 * cache back to a Set.
 */
const KEY = "/api/games/g1/expected-late-seats";

function ArrayBacked() {
  const { data } = useSWR<string[]>(KEY, async () => []);
  const seats = useMemo(() => new Set(data ?? []), [data]);
  const { mutate } = useSWRConfig();
  return (
    <div>
      <div data-testid="late">{seats.has("A1EW") ? "yes" : "no"}</div>
      <button
        onClick={() =>
          mutate(
            KEY,
            (cur?: string[]) => Array.from(new Set(cur ?? []).add("A1EW")),
            { revalidate: false },
          )
        }
      >
        flip
      </button>
    </div>
  );
}

describe("expected-late SWR reactivity", () => {
  it("re-renders a bound consumer when the array-backed cache is flipped", async () => {
    render(<ArrayBacked />);
    await waitFor(() =>
      expect(screen.getByTestId("late")).toHaveTextContent("no"),
    );

    fireEvent.click(screen.getByText("flip"));

    await waitFor(() =>
      expect(screen.getByTestId("late")).toHaveTextContent("yes"),
    );
  });
});
