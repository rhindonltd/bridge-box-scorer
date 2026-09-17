import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { Deal } from "@/model/common";

// GamePageLayout is stubbed to surface the header title, the action buttons,
// and the children so the test can focus on the deal-stepping behaviour.
vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    actions,
    children,
  }: {
    headerTitle: string;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

// DealEntry is stubbed to expose the board it is rendering, whether it is in
// read-only (already-entered) mode, and a button that submits a fixed deal.
vi.mock("@/components/deal/DealEntry", () => ({
  DealEntry: ({
    boardNumber,
    onSubmit,
    readOnlyDeal,
  }: {
    boardNumber: number;
    onSubmit: (deal: Deal) => void;
    readOnlyDeal?: Deal | null;
  }) => (
    <div>
      <span data-testid="entry-board">{boardNumber}</span>
      <span data-testid="entry-readonly">{String(readOnlyDeal !== null)}</span>
      <button
        onClick={() => onSubmit({ N: [], E: [], S: [], W: [] } as Deal)}
      >
        submit-deal
      </button>
    </div>
  ),
}));

import { EnterDealsPage } from "./EnterDealsPage";

const stored = (v: boolean) => ({ stored: v });

describe("EnterDealsPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows the first board with a 'x of n' position and an optional-entry hint", () => {
    render(
      <EnterDealsPage
        boards={[3, 4]}
        onSubmitDeal={vi.fn().mockResolvedValue(stored(true))}
        onDone={vi.fn()}
      />,
    );
    expect(screen.getByTestId("entry-board").textContent).toBe("3");
    expect(screen.getByText(/Board 3 \(1 of 2\)/)).toBeInTheDocument();
    expect(screen.getByText(/optional/i)).toBeInTheDocument();
  });

  it("labels the skip button 'Skip' on the first board and 'Done' after advancing", async () => {
    const onSubmitDeal = vi.fn().mockResolvedValue(stored(true));
    render(
      <EnterDealsPage boards={[1, 2]} onSubmitDeal={onSubmitDeal} onDone={vi.fn()} />,
    );

    expect(screen.getByTestId("skip-deals")).toHaveTextContent("Skip");

    // Save board 1 -> advances to board 2, where the button reads "Done".
    fireEvent.click(screen.getByText("submit-deal"));
    await waitFor(() =>
      expect(screen.getByTestId("entry-board").textContent).toBe("2"),
    );
    expect(screen.getByTestId("skip-deals")).toHaveTextContent("Done");
  });

  it("skips the whole step via the skip button", () => {
    const onDone = vi.fn();
    render(
      <EnterDealsPage
        boards={[1, 2]}
        onSubmitDeal={vi.fn().mockResolvedValue(stored(true))}
        onDone={onDone}
      />,
    );
    fireEvent.click(screen.getByTestId("skip-deals"));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("advances to the next board when a deal is stored", async () => {
    const onSubmitDeal = vi.fn().mockResolvedValue(stored(true));
    render(
      <EnterDealsPage boards={[1, 2]} onSubmitDeal={onSubmitDeal} onDone={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("submit-deal"));

    await waitFor(() =>
      expect(screen.getByTestId("entry-board").textContent).toBe("2"),
    );
    expect(onSubmitDeal).toHaveBeenCalledWith(1, expect.any(Object));
  });

  it("calls onDone after storing the last board", async () => {
    const onSubmitDeal = vi.fn().mockResolvedValue(stored(true));
    const onDone = vi.fn();
    render(
      <EnterDealsPage boards={[7]} onSubmitDeal={onSubmitDeal} onDone={onDone} />,
    );

    fireEvent.click(screen.getByText("submit-deal"));

    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });

  it("shows the already-entered state (first-wins) with a next-board button", async () => {
    // stored:false means another player entered this board first.
    const onSubmitDeal = vi.fn().mockResolvedValue(stored(false));
    render(
      <EnterDealsPage boards={[1, 2]} onSubmitDeal={onSubmitDeal} onDone={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("submit-deal"));

    // Still on board 1, now read-only, with a "Next board" action.
    await waitFor(() =>
      expect(screen.getByTestId("entry-readonly").textContent).toBe("true"),
    );
    expect(screen.getByTestId("entry-board").textContent).toBe("1");
    const next = screen.getByTestId("deals-next-board");
    expect(next).toHaveTextContent("Next board");

    // Advancing clears the read-only state and moves to board 2.
    fireEvent.click(next);
    expect(screen.getByTestId("entry-board").textContent).toBe("2");
    expect(screen.getByTestId("entry-readonly").textContent).toBe("false");
  });

  it("labels the advance button 'Finish' when the last board was already entered", async () => {
    const onSubmitDeal = vi.fn().mockResolvedValue(stored(false));
    const onDone = vi.fn();
    render(
      <EnterDealsPage boards={[9]} onSubmitDeal={onSubmitDeal} onDone={onDone} />,
    );

    fireEvent.click(screen.getByText("submit-deal"));

    const next = await screen.findByTestId("deals-next-board");
    expect(next).toHaveTextContent("Finish");

    fireEvent.click(next);
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("shows an error banner when saving fails and stays on the board", async () => {
    const onSubmitDeal = vi.fn().mockRejectedValue(new Error("save boom"));
    render(
      <EnterDealsPage boards={[1, 2]} onSubmitDeal={onSubmitDeal} onDone={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("submit-deal"));

    expect(await screen.findByText("save boom")).toBeInTheDocument();
    // Still on board 1 (did not advance).
    expect(screen.getByTestId("entry-board").textContent).toBe("1");
  });

  it("shows a default error message for a non-Error rejection", async () => {
    const onSubmitDeal = vi.fn().mockRejectedValue("nope");
    render(
      <EnterDealsPage boards={[1]} onSubmitDeal={onSubmitDeal} onDone={vi.fn()} />,
    );

    fireEvent.click(screen.getByText("submit-deal"));

    expect(
      await screen.findByText("Could not save the cards"),
    ).toBeInTheDocument();
  });
});
