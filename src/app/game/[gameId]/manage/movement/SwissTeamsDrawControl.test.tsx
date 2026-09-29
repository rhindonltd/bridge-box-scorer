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
    // Distinct standings labels (won't collide with the match-card team names
    // in the DOM, so the test can target match content unambiguously).
    standings: [
      { id: 1, name: "Standing Team 1", total: 30, rank: 1, tied: false },
      { id: 3, name: "Standing Team 3", total: 25, rank: 2, tied: false },
      { id: 2, name: "Standing Team 2", total: 20, rank: 3, tied: false },
      { id: 4, name: "Standing Team 4", total: 15, rank: 4, tied: false },
    ],
    repeatMatchKeys: [],
    advisoryInputs: { teams: 4, playedOpponents: [] },
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
    // Each team's running total is shown inline on its match card (2 dp, "VP").
    // Team 1 (Sharks) has a total of 30 in the fixture standings.
    expect(screen.getByText("30.00 VP")).toBeInTheDocument();
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

  it("commits the edited round after the director swaps two teams", async () => {
    vi.mocked(previewNextSwissTeamsRound).mockResolvedValue(
      previewAck() as never,
    );
    vi.mocked(commitNextSwissTeamsRound).mockResolvedValue({
      roundNumber: 2,
    } as never);

    render(<SwissTeamsDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));
    await screen.findByTestId("draw-confirm");

    // Draw is 1v3 (Sharks v Owls) and 2v4 (Dragons v Eagles). Swap Owls (3)
    // with Dragons (2) so the matches become 1v2 and 3v4.
    fireEvent.click(screen.getByRole("button", { name: /Owls/ }));
    fireEvent.click(screen.getByRole("button", { name: /Dragons/ }));
    fireEvent.click(screen.getByTestId("draw-confirm"));

    await waitFor(() =>
      expect(commitNextSwissTeamsRound).toHaveBeenCalledWith(
        "g1",
        "A",
        [
          { a: 1, b: 2 },
          { a: 3, b: 4 },
        ],
        null,
        null,
      ),
    );
  });

  it("highlights the match that repeats an earlier opponent", async () => {
    vi.mocked(previewNextSwissTeamsRound).mockResolvedValue(
      // Match 1v3 (Sharks v Owls) repeats — recorded in the played history so
      // the preview's live re-check flags it (key "1-3").
      previewAck({
        advisoryInputs: { teams: 4, playedOpponents: ["1-3"] },
        hadUnavoidableRepeat: true,
      }) as never,
    );

    render(<SwissTeamsDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));
    await screen.findByTestId("draw-confirm");

    // The repeating match card is flagged; the other is not.
    const matchCards = screen.getAllByTestId("teams-match");
    const flagged = matchCards.filter(
      (c) => c.getAttribute("data-problem") === "true",
    );
    expect(flagged).toHaveLength(1);
    expect(flagged[0]).toHaveTextContent(/check this match/i);
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
        advisoryInputs: { teams: 5, playedOpponents: [] },
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
