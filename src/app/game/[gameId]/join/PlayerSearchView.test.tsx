import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlayerSearchView } from "@/app/game/[gameId]/join/PlayerSearchView";
import { NewPlayer } from "@/db/games/tables/players";

const player = (over: Partial<NewPlayer> = {}): NewPlayer =>
  ({
    firstName: "Ada",
    lastName: "Lovelace",
    nationalId: "123456",
    ...over,
  }) as NewPlayer;

const baseProps = {
  label: "North",
  value: null,
  query: "",
  results: [] as NewPlayer[],
  loading: false,
  onQueryChange: vi.fn(),
  onPlayerSelected: vi.fn(),
  onClear: vi.fn(),
};

describe("PlayerSearchView", () => {
  it("renders a selected player card and clears it", () => {
    const onClear = vi.fn();
    render(
      <PlayerSearchView
        {...baseProps}
        value={player()}
        onClear={onClear}
      />,
    );

    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.getByText("EBU 123456")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("renders a selected player without a national id", () => {
    render(
      <PlayerSearchView
        {...baseProps}
        value={player({ nationalId: null })}
      />,
    );
    expect(screen.getByText("Ada Lovelace")).toBeInTheDocument();
    expect(screen.queryByText(/^EBU/)).not.toBeInTheDocument();
  });

  it("fires onQueryChange when typing in the search input", () => {
    const onQueryChange = vi.fn();
    render(<PlayerSearchView {...baseProps} onQueryChange={onQueryChange} />);
    fireEvent.change(
      screen.getByTestId("player-search-input-North"),
      { target: { value: "lov" } },
    );
    expect(onQueryChange).toHaveBeenCalledWith("lov");
  });

  it("shows the loading indicator", () => {
    render(<PlayerSearchView {...baseProps} loading query="lo" />);
    expect(screen.getByText("Searching...")).toBeInTheDocument();
  });

  it("renders results and selects one, including a result without an id", () => {
    const onPlayerSelected = vi.fn();
    render(
      <PlayerSearchView
        {...baseProps}
        query="lo"
        results={[player(), player({ firstName: "Grace", nationalId: null })]}
        onPlayerSelected={onPlayerSelected}
      />,
    );

    const results = screen.getAllByTestId("player-search-result");
    expect(results).toHaveLength(2);
    // Second result has no EBU id line.
    expect(screen.getByText("Grace Lovelace")).toBeInTheDocument();

    fireEvent.click(results[0]);
    expect(onPlayerSelected).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Ada" }),
    );
  });
});
