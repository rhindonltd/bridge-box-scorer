import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Key-aware SWR mock: each swrKeys entry maps to a slot in `swrData`; a null key
// (the skipped detail requests) yields no data.
let swrData: Record<string, unknown>;
const requestedKeys: (string | null)[] = [];
vi.mock("swr", () => ({
  default: (key: string | null) => {
    requestedKeys.push(key);
    if (key === null) return { data: undefined };
    return { data: swrData[key] };
  },
}));
vi.mock("@/lib/fetcher", () => ({
  fetcher: vi.fn(),
  unwrapFetcher: () => vi.fn(),
}));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: {
    resultsSummary: (id: string) => `summary:${id}`,
    club: () => "club",
    bridgewebs: () => "bridgewebs",
    ebu: () => "ebu",
    outstandingBoards: (id: string) => `outstanding:${id}`,
    sections: (id: string) => `sections:${id}`,
  },
}));

// Surface the derived checklist so we can assert on it.
vi.mock("@/app/game/[gameId]/manage/export/ExportReadinessPage", () => ({
  ExportReadinessPage: ({
    items,
    onBack,
    onContinue,
  }: {
    items: {
      id: string;
      level: string;
      detail: string;
      boards?: { title: string }[];
    }[];
    onBack: () => void;
    onContinue: () => void;
  }) => (
    <div>
      <button onClick={onBack}>back</button>
      <button onClick={onContinue}>continue</button>
      {items.map((i) => (
        <div key={i.id} data-testid={`item-${i.id}`}>
          {i.level}|{i.detail}|{i.boards?.map((b) => b.title).join(";") ?? ""}
        </div>
      ))}
    </div>
  ),
}));

import { ExportReadiness } from "./ExportReadiness";

const board = {
  section: "B",
  tableNumber: 2,
  boardNumber: 7,
  roundNumber: 3,
  nsPair: "A & B",
  ewPair: "C & D",
};

describe("ExportReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requestedKeys.length = 0;
    swrData = {
      "summary:g1": { totalPlayable: 24, finalized: 24 },
      club: { club: { name: "Club", clubNumber: "123" } },
      bridgewebs: { configured: true },
      ebu: { configured: true },
    };
  });

  it("routes back and continue", () => {
    render(<ExportReadiness gameId="g1" />);
    fireEvent.click(screen.getByText("back"));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage");
    fireEvent.click(screen.getByText("continue"));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/manage/export/options");
  });

  it("reports everything ready and skips the detail requests", () => {
    render(<ExportReadiness gameId="g1" />);
    expect(screen.getByTestId("item-results").textContent).toMatch(/^ready/);
    expect(requestedKeys).toContain(null);
    expect(requestedKeys).not.toContain("outstanding:g1");
  });

  it("fetches the outstanding detail when a few boards remain", () => {
    swrData["summary:g1"] = { totalPlayable: 24, finalized: 22 };
    swrData["outstanding:g1"] = [board];
    swrData["sections:g1"] = [{ section: "A" }, { section: "B" }];
    render(<ExportReadiness gameId="g1" />);
    expect(requestedKeys).toContain("outstanding:g1");
    expect(requestedKeys).toContain("sections:g1");
    expect(screen.getByTestId("item-results").textContent).toContain(
      "Round 3 · Section B · Table 2 · Board 7",
    );
  });

  it("omits the section from the detail for a single section game", () => {
    swrData["summary:g1"] = { totalPlayable: 24, finalized: 23 };
    swrData["outstanding:g1"] = [board];
    swrData["sections:g1"] = [{ section: "A" }];
    render(<ExportReadiness gameId="g1" />);
    expect(screen.getByTestId("item-results").textContent).toContain(
      "Round 3 · Table 2 · Board 7",
    );
  });

  it("does not fetch the detail when many boards are outstanding", () => {
    swrData["summary:g1"] = { totalPlayable: 24, finalized: 0 };
    render(<ExportReadiness gameId="g1" />);
    expect(requestedKeys).not.toContain("outstanding:g1");
  });

  it("falls back to not-configured defaults while data loads", () => {
    swrData = {};
    render(<ExportReadiness gameId="g1" />);
    expect(screen.getByTestId("item-club").textContent).toMatch(/^blocker/);
    expect(screen.getByTestId("item-bridgewebs").textContent).toMatch(
      /^info/,
    );
    expect(screen.getByTestId("item-ebu").textContent).toMatch(/^info/);
  });

  it("treats a club with no name or number as unconfigured", () => {
    swrData.club = { club: { name: "Club", clubNumber: "  " } };
    render(<ExportReadiness gameId="g1" />);
    expect(screen.getByTestId("item-club").textContent).toMatch(/^blocker/);
    swrData.club = { club: null };
    render(<ExportReadiness gameId="g1" />);
    swrData.club = { club: { name: null, clubNumber: null } };
    render(<ExportReadiness gameId="g1" />);
  });
});
