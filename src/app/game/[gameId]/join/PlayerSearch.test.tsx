import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import PlayerSearch from "@/app/game/[gameId]/join/PlayerSearch";
import { swrKeys } from "@/swr/swr-keys";

const mockUseSWR = vi.fn();
vi.mock("swr", () => ({
  default: (...args: unknown[]) => mockUseSWR(...args),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

// Stub the presentational view; expose props via data attributes / handlers.
vi.mock("@/app/game/[gameId]/join/PlayerSearchView", () => ({
  PlayerSearchView: ({
    query,
    results,
    loading,
    value,
    onQueryChange,
    onPlayerSelected,
    onClear,
  }: any) => (
    <div>
      <div data-testid="query">{query}</div>
      <div data-testid="results-count">{results.length}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="value">{value ? value.firstName : "none"}</div>
      <input
        data-testid="input"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <button
        data-testid="select"
        onClick={() => onPlayerSelected({ firstName: "Ada", lastName: "L" })}
      />
      <button data-testid="clear" onClick={onClear} />
    </div>
  ),
}));

describe("PlayerSearch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockUseSWR.mockReset();
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: false });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function type(value: string) {
    fireEvent.change(screen.getByTestId("input"), { target: { value } });
  }

  function advanceDebounce() {
    act(() => {
      vi.advanceTimersByTime(250);
    });
  }

  it("does not search and shows no results while the query is under 2 chars", () => {
    render(<PlayerSearch label="North" value={null} onChange={vi.fn()} />);

    type("a");
    advanceDebounce();

    // shouldSearch is false -> SWR key is null.
    expect(mockUseSWR).toHaveBeenLastCalledWith(null, expect.any(Function));
    expect(screen.getByTestId("results-count")).toHaveTextContent("0");
  });

  it("searches with the playerSearch key once the query is long enough", () => {
    mockUseSWR.mockReturnValue({
      data: [{ firstName: "Ada", lastName: "L" }],
      isLoading: false,
    });
    render(<PlayerSearch label="North" value={null} onChange={vi.fn()} />);

    type("lov");
    advanceDebounce();

    expect(mockUseSWR).toHaveBeenLastCalledWith(
      swrKeys.playerSearch("lov"),
      expect.any(Function),
    );
    expect(screen.getByTestId("results-count")).toHaveTextContent("1");
  });

  it("passes the loading flag through only while searching", () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true });
    render(<PlayerSearch label="North" value={null} onChange={vi.fn()} />);

    type("lo");
    advanceDebounce();

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
  });

  it("selecting a player clears the query and calls onChange", () => {
    const onChange = vi.fn();
    render(<PlayerSearch label="North" value={null} onChange={onChange} />);

    type("lov");
    advanceDebounce();
    expect(screen.getByTestId("query")).toHaveTextContent("lov");

    fireEvent.click(screen.getByTestId("select"));
    expect(onChange).toHaveBeenCalledWith({ firstName: "Ada", lastName: "L" });
    expect(screen.getByTestId("query")).toHaveTextContent("");
  });

  it("onClear calls onChange(null)", () => {
    const onChange = vi.fn();
    render(<PlayerSearch label="North" value={null} onChange={onChange} />);
    fireEvent.click(screen.getByTestId("clear"));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("passes the selected value through to the view", () => {
    render(
      <PlayerSearch
        label="North"
        value={{ firstName: "Grace" } as any}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("value")).toHaveTextContent("Grace");
  });
});
