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
    guestOption,
    loading,
    value,
    onQueryChange,
    onPlayerSelected,
    onGuestSelected,
    onClear,
  }: any) => (
    <div>
      <div data-testid="query">{query}</div>
      <div data-testid="results-count">{results.length}</div>
      <div data-testid="loading">{String(loading)}</div>
      <div data-testid="value">{value ? value.firstName : "none"}</div>
      <div data-testid="guest">
        {guestOption
          ? `${guestOption.firstName}|${guestOption.lastName}|${String(
              guestOption.nationalId,
            )}`
          : "none"}
      </div>
      <input
        data-testid="input"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
      />
      <button
        data-testid="select"
        onClick={() => onPlayerSelected({ firstName: "Ada", lastName: "L" })}
      />
      <button
        data-testid="select-guest"
        onClick={() => guestOption && onGuestSelected(guestOption)}
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

  it("offers the typed name as a guest (first/last split, no national id)", () => {
    render(<PlayerSearch label="North" value={null} onChange={vi.fn()} />);

    type("Alice Smith");
    // No debounce needed: the guest option is derived from the live query.
    expect(screen.getByTestId("guest")).toHaveTextContent("Alice|Smith|null");
  });

  it("treats a single word as a first name with an empty last name", () => {
    render(<PlayerSearch label="North" value={null} onChange={vi.fn()} />);
    type("Madonna");
    expect(screen.getByTestId("guest")).toHaveTextContent("Madonna||null");
  });

  it("does not offer a guest for a purely numeric query (an id lookup)", () => {
    render(<PlayerSearch label="North" value={null} onChange={vi.fn()} />);
    type("123456");
    expect(screen.getByTestId("guest")).toHaveTextContent("none");
  });

  it("does not offer a guest until the query is at least 2 chars", () => {
    render(<PlayerSearch label="North" value={null} onChange={vi.fn()} />);
    type("A");
    expect(screen.getByTestId("guest")).toHaveTextContent("none");
  });

  it("selecting the guest clears the query and calls onChange with the guest", () => {
    const onChange = vi.fn();
    render(<PlayerSearch label="North" value={null} onChange={onChange} />);

    type("Bob Jones");
    fireEvent.click(screen.getByTestId("select-guest"));

    expect(onChange).toHaveBeenCalledWith({
      firstName: "Bob",
      lastName: "Jones",
      nationalId: null,
    });
    expect(screen.getByTestId("query")).toHaveTextContent("");
  });
});
