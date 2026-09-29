import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/swiss-service", () => ({
  previewNextSwissTeamsRound: vi.fn(),
  commitNextSwissTeamsRound: vi.fn(),
}));

import {
  previewNextSwissTeamsRound,
  commitNextSwissTeamsRound,
} from "@/lib/swiss-service";
import { SwissTeamsDrawControl } from "./SwissTeamsDrawControl";

/** A minimal preview ack for a 4-team field: matches 1v3 and 2v4, no bye. */
function previewAck(over: Record<string, unknown> = {}) {
  return {
    roundNumber: 2,
    teams: 4,
    matches: [
      { a: 1, b: 3 },
      { a: 2, b: 4 },
    ],
    byeTeamId: null,
    triangle: null,
    named: {
      matches: [
        { a: { teamId: 1, name: "Sharks" }, b: { teamId: 3, name: "Owls" } },
        { a: { teamId: 2, name: "Dragons" }, b: { teamId: 4, name: "Eagles" } },
      ],
      bye: null,
      triangle: null,
    },
    hadUnavoidableRepeat: false,
    ...over,
  };
}

describe("SwissTeamsDrawControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables Draw Next Round until all results are in", () => {
    render(
      <SwissTeamsDrawControl gameId="g1" section="A" allResultsIn={false} />,
    );
    expect(screen.getByTestId("draw-next-round")).toBeDisabled();
    expect(screen.getByText(/Waiting for all results/i)).toBeInTheDocument();
  });

  it("previews the draw (no commit) and shows the review page with team names", async () => {
    vi.mocked(previewNextSwissTeamsRound).mockResolvedValue(
      previewAck() as never,
    );

    render(<SwissTeamsDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    await waitFor(() =>
      expect(previewNextSwissTeamsRound).toHaveBeenCalledWith("g1", "A"),
    );
    expect(await screen.findByTestId("draw-confirm")).toBeInTheDocument();
    expect(screen.getByTestId("draw-cancel")).toBeInTheDocument();
    expect(commitNextSwissTeamsRound).not.toHaveBeenCalled();
    expect(screen.getByText("Sharks")).toBeInTheDocument();
    expect(screen.getByText("Owls")).toBeInTheDocument();
  });

  it("commits the shown round on OK and shows a confirmation", async () => {
    vi.mocked(previewNextSwissTeamsRound).mockResolvedValue(
      previewAck() as never,
    );
    vi.mocked(commitNextSwissTeamsRound).mockResolvedValue({
      roundNumber: 2,
    } as never);

    render(<SwissTeamsDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));
    fireEvent.click(await screen.findByTestId("draw-confirm"));

    await waitFor(() =>
      expect(commitNextSwissTeamsRound).toHaveBeenCalledWith(
        "g1",
        "A",
        [
          { a: 1, b: 3 },
          { a: 2, b: 4 },
        ],
        null,
        null,
      ),
    );
    expect(await screen.findByTestId("draw-notice")).toHaveTextContent(
      "Round 2 drawn.",
    );
  });

  it("discards the draw on Cancel without committing", async () => {
    vi.mocked(previewNextSwissTeamsRound).mockResolvedValue(
      previewAck() as never,
    );

    render(<SwissTeamsDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));
    fireEvent.click(await screen.findByTestId("draw-cancel"));

    await waitFor(() =>
      expect(screen.getByTestId("draw-next-round")).toBeInTheDocument(),
    );
    expect(commitNextSwissTeamsRound).not.toHaveBeenCalled();
  });

  it("shows an error when the preview is rejected", async () => {
    vi.mocked(previewNextSwissTeamsRound).mockRejectedValue(
      new Error("All results for the current round must be in first."),
    );

    render(<SwissTeamsDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    await waitFor(() =>
      expect(screen.getByTestId("draw-error")).toHaveTextContent(
        /current round/i,
      ),
    );
  });

  it("commits a bye round, forwarding the bye team id", async () => {
    vi.mocked(previewNextSwissTeamsRound).mockResolvedValue(
      previewAck({
        teams: 5,
        matches: [
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ],
        byeTeamId: 5,
        named: {
          matches: [
            { a: { teamId: 1, name: "Sharks" }, b: { teamId: 2, name: "Dragons" } },
            { a: { teamId: 3, name: "Owls" }, b: { teamId: 4, name: "Eagles" } },
          ],
          bye: { teamId: 5, name: "Robins" },
          triangle: null,
        },
      }) as never,
    );
    vi.mocked(commitNextSwissTeamsRound).mockResolvedValue({
      roundNumber: 2,
    } as never);

    render(<SwissTeamsDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));
    // The bye team is shown on the review.
    expect(await screen.findByText("Robins")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("draw-confirm"));

    await waitFor(() =>
      expect(commitNextSwissTeamsRound).toHaveBeenCalledWith(
        "g1",
        "A",
        [
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ],
        5,
        null,
      ),
    );
  });
});
