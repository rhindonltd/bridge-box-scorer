import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/swiss-service", () => ({
  drawNextSwissRound: vi.fn(),
}));

import { drawNextSwissRound } from "@/lib/swiss-service";
import { SwissDrawControl } from "./SwissDrawControl";

describe("SwissDrawControl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disables Draw Next Round until all results are in", () => {
    render(<SwissDrawControl gameId="g1" section="A" allResultsIn={false} />);
    expect(screen.getByTestId("draw-next-round")).toBeDisabled();
    expect(screen.getByText(/Waiting for all results/i)).toBeInTheDocument();
  });

  it("enables the button when all results are in and draws the next round", async () => {
    vi.mocked(drawNextSwissRound).mockResolvedValue({
      roundNumber: 2,
      sitOutPairId: null,
      hadUnavoidableRepeat: false,
      hadStationaryConflict: false,
    });

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);

    const button = screen.getByTestId("draw-next-round");
    expect(button).toBeEnabled();
    fireEvent.click(button);

    await waitFor(() =>
      expect(drawNextSwissRound).toHaveBeenCalledWith("g1", "A"),
    );
    expect(screen.getByTestId("draw-notice")).toHaveTextContent(
      "Round 2 drawn.",
    );
  });

  it("warns about an unavoidable repeat, a stationary conflict, and a bye", async () => {
    vi.mocked(drawNextSwissRound).mockResolvedValue({
      roundNumber: 3,
      sitOutPairId: 5,
      hadUnavoidableRepeat: true,
      hadStationaryConflict: true,
    });

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    await waitFor(() => screen.getByTestId("draw-notice"));
    const notice = screen.getByTestId("draw-notice").textContent ?? "";
    expect(notice).toContain("Round 3 drawn.");
    expect(notice).toContain("bye");
    expect(notice).toContain("repeat pairing");
    expect(notice).toContain("stationary pairs");
  });

  it("shows the server error when the draw is rejected", async () => {
    vi.mocked(drawNextSwissRound).mockRejectedValue(
      new Error("All results for the current round must be in first."),
    );

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    await waitFor(() =>
      expect(screen.getByTestId("draw-error")).toHaveTextContent(
        /All results for the current round/i,
      ),
    );
  });

  it("shows a generic error when the draw rejects with a non-Error", async () => {
    vi.mocked(drawNextSwissRound).mockRejectedValue("nope");

    render(<SwissDrawControl gameId="g1" section="A" allResultsIn />);
    fireEvent.click(screen.getByTestId("draw-next-round"));

    await waitFor(() =>
      expect(screen.getByTestId("draw-error")).toHaveTextContent(
        "Could not draw the next round.",
      ),
    );
  });
});
