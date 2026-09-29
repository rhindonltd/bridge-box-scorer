import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/swiss-service", () => ({
  previewNextSwissRound: vi.fn(),
  commitNextSwissRound: vi.fn(),
}));

import {
  previewNextSwissRound,
  commitNextSwissRound,
} from "@/lib/swiss-service";
import { SwissDrawControl } from "./SwissDrawControl";

/** A minimal preview ack for a 2-table field, pair 1v3 / 2v4, no bye. */
function previewAck(over: Record<string, unknown> = {}) {
  return {
    roundNumber: 2,
    tables: 2,
    seating: [
      { tableNumber: 1, ns: 1, ew: 3 },
      { tableNumber: 2, ns: 2, ew: 4 },
    ],
    sitOutPairId: null,
    named: {
      tables: [
        {
          tableNumber: 1,
          nsPairId: 1,
          ewPairId: 3,
          players: {
            N: { firstName: "Alice", lastName: "N" },
            S: { firstName: "Bob", lastName: "S" },
            E: { firstName: "Carol", lastName: "E" },
            W: { firstName: "Dave", lastName: "W" },
          },
        },
        {
          tableNumber: 2,
          nsPairId: 2,
          ewPairId: 4,
          players: {
            N: { firstName: "Erin", lastName: "N" },
            S: { firstName: "Frank", lastName: "S" },
            E: { firstName: "Gina", lastName: "E" },
            W: { firstName: "Hugo", lastName: "W" },
          },
        },
      ],
      bye: null,
    },
    advisoryInputs: {
      tables: 2,
      playedOpponents: [],
      hadBye: [],
      directionCounts: [],
      stationary: [],
    },
    hadUnavoidableRepeat: false,
    hadStationaryConflict: false,
    ...over,
  };
}

describe("SwissDrawControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables Draw Next Round until all results are in", () => {
    render(<SwissDrawControl gameId="g1" section="A" allResultsIn={false} />);
    expect(screen.getByTestId("draw-next-round")).toBeDisabled();
    expect(screen.getByText(/Waiting for all results/i)).toBeInTheDocument();
  });

  it("previews the draw (no commit) and shows the review page", async () => {
    vi.mocked(previewNextSwissRound).mockResolvedValue(previewAck() as never);

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    await waitFor(() =>
      expect(previewNextSwissRound).toHaveBeenCalledWith("g1", "A"),
    );
    // The review page appears with OK/Cancel; nothing is committed yet.
    expect(await screen.findByTestId("draw-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("draw-cancel")).toBeInTheDocument();
    expect(commitNextSwissRound).not.toHaveBeenCalled();
    // Player names from the preview are shown.
    expect(screen.getByText("Alice N / Bob S")).toBeInTheDocument();
  });

  it("commits the shown seating on OK and shows a confirmation", async () => {
    vi.mocked(previewNextSwissRound).mockResolvedValue(previewAck() as never);
    vi.mocked(commitNextSwissRound).mockResolvedValue({
      roundNumber: 2,
    } as never);

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    fireEvent.click(await screen.findByTestId("draw-confirm"));

    await waitFor(() =>
      expect(commitNextSwissRound).toHaveBeenCalledWith(
        "g1",
        "A",
        [
          { tableNumber: 1, ns: 1, ew: 3 },
          { tableNumber: 2, ns: 2, ew: 4 },
        ],
        null,
      ),
    );
    expect(await screen.findByTestId("draw-notice")).toHaveTextContent(
      "Round 2 drawn.",
    );
  });

  it("commits an EDITED seating when the director swaps two pairs", async () => {
    vi.mocked(previewNextSwissRound).mockResolvedValue(previewAck() as never);
    vi.mocked(commitNextSwissRound).mockResolvedValue({
      roundNumber: 2,
    } as never);

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));
    await screen.findByTestId("draw-confirm");

    // Swap pair 3 (Carol/Dave, table 1 E/W) with pair 2 (Erin/Frank, table 2 N/S).
    fireEvent.click(screen.getByText("Carol E / Dave W"));
    fireEvent.click(screen.getByText("Erin N / Frank S"));

    fireEvent.click(screen.getByTestId("draw-confirm"));

    await waitFor(() => expect(commitNextSwissRound).toHaveBeenCalled());
    const [, , seating] = vi.mocked(commitNextSwissRound).mock.calls[0];
    // Pair 2 and 3 exchanged seats.
    expect(seating).toEqual([
      { tableNumber: 1, ns: 1, ew: 2 },
      { tableNumber: 2, ns: 3, ew: 4 },
    ]);
  });

  it("discards the draw on Cancel without committing", async () => {
    vi.mocked(previewNextSwissRound).mockResolvedValue(previewAck() as never);

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    fireEvent.click(await screen.findByTestId("draw-cancel"));

    await waitFor(() =>
      expect(screen.getByTestId("draw-next-round")).toBeInTheDocument(),
    );
    expect(commitNextSwissRound).not.toHaveBeenCalled();
  });

  it("shows an error when the preview is rejected", async () => {
    vi.mocked(previewNextSwissRound).mockRejectedValue(
      new Error("All results for the current round must be in first."),
    );

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    await waitFor(() =>
      expect(screen.getByTestId("draw-error")).toHaveTextContent(
        /current round/i,
      ),
    );
  });

  it("surfaces advisories on the review page", async () => {
    vi.mocked(previewNextSwissRound).mockResolvedValue(
      previewAck({
        advisoryInputs: {
          tables: 2,
          // Pairs 1 and 3 have already met — the drawn 1v3 is a repeat.
          playedOpponents: ["1-3"],
          hadBye: [],
          directionCounts: [],
          stationary: [],
        },
        hadUnavoidableRepeat: true,
      }) as never,
    );

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    expect(await screen.findByTestId("draw-advisories")).toHaveTextContent(
      /repeats an earlier-round opponent/i,
    );
  });
});
