import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {children}
    </div>
  ),
}));

import { SubstitutionsPage } from "./SubstitutionsPage";
import type { SubstitutionSeat } from "@/db/games/queries/find-substitution-seats";

const row = (overrides: Partial<SubstitutionSeat> = {}): SubstitutionSeat => ({
  seat: "A1NS",
  pair: "Late One & Late Two",
  playedCount: 2,
  missedCount: 2,
  split: false,
  occupants: [
    {
      id: 2,
      pair: "Late One & Late Two",
      boardCount: 2,
      eligible: true,
      isArrivalAnchor: true,
      isMainPair: true,
    },
    {
      id: 1,
      pair: "Early One & Early Two",
      boardCount: 2,
      eligible: true,
      isArrivalAnchor: false,
      isMainPair: false,
    },
  ],
  ...overrides,
});

describe("SubstitutionsPage", () => {
  const onBack = vi.fn();
  const onSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
    onSave.mockResolvedValue(undefined);
  });

  it("wires the back action", () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalled();
  });

  it("shows an empty state when there are no substitutions", () => {
    render(
      <SubstitutionsPage onBack={onBack} onSave={onSave} substitutions={[]} />,
    );
    expect(
      screen.getByText("No substitutions to configure."),
    ).toBeInTheDocument();
  });

  it("lists the seat with both occupants and their board counts", () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );
    expect(screen.getByText("A1NS")).toBeInTheDocument();
    expect(
      screen.getByText(/Late One & Late Two — 2 boards/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Early One & Early Two — 2 boards/),
    ).toBeInTheDocument();
  });

  it("defaults to one merged line with a single eligibility toggle, saving split=false both eligible", async () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row({ seat: "B2EW" })]}
      />,
    );

    // One-line mode shows the single merged-line eligibility toggle, not the
    // per-occupant ones.
    expect(screen.getByText("Eligible for local ranking?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith("B2EW", {
        split: false,
        eligibility: [
          { id: 2, eligible: true },
          { id: 1, eligible: true },
        ],
        // Default main pair = the arrival anchor (id 2).
        mainOccupancyId: 2,
      }),
    );
  });

  it("switching to Two lines reveals a per-occupant eligibility toggle and saves split=true", async () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );

    const splitGroup = screen.getByRole("group", { name: "Split by board?" });
    fireEvent.click(within(splitGroup).getByText("Two lines"));

    // Per-occupant eligibility toggles appear.
    expect(screen.getByText("Late One & Late Two ranked?")).toBeInTheDocument();
    expect(
      screen.getByText("Early One & Early Two ranked?"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith("A1NS", {
        split: true,
        eligibility: [
          { id: 2, eligible: true },
          { id: 1, eligible: true },
        ],
      }),
    );
  });

  it("marks one occupant ineligible when split, saving that occupant WITHOUT standing", async () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );

    const splitGroup = screen.getByRole("group", { name: "Split by board?" });
    fireEvent.click(within(splitGroup).getByText("Two lines"));

    // Mark the earlier pair (id 1) NOT ranked.
    const earlier = screen.getByRole("group", {
      name: "Early One & Early Two ranked?",
    });
    fireEvent.click(within(earlier).getByText("No"));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith("A1NS", {
        split: true,
        eligibility: [
          { id: 2, eligible: true },
          { id: 1, eligible: false },
        ],
      }),
    );
  });

  it("applies the merged-line eligibility to BOTH occupants when not split", async () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );

    // In one-line mode, turning the single toggle off marks the whole line
    // (both occupants) without standing on save.
    const merged = screen.getByRole("group", {
      name: "Eligible for local ranking?",
    });
    fireEvent.click(within(merged).getByText("No"));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith("A1NS", {
        split: false,
        eligibility: [
          { id: 2, eligible: false },
          { id: 1, eligible: false },
        ],
        mainOccupancyId: 2,
      }),
    );
  });

  it("lets the director pick the other pair as the main pair (merged seat)", async () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );

    // The Main pair control lists both pairs; default is the anchor (id 2).
    const mainGroup = screen.getByRole("group", { name: "Main pair for A1NS" });
    expect(mainGroup).toBeInTheDocument();

    // Pick the earlier pair (id 1) as the main pair.
    fireEvent.click(within(mainGroup).getByText("Early One & Early Two"));

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith("A1NS", {
        split: false,
        eligibility: [
          { id: 2, eligible: true },
          { id: 1, eligible: true },
        ],
        mainOccupancyId: 1,
      }),
    );
  });

  it("hides the Main pair control when the seat is split", async () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );

    // Merged by default → Main pair control present.
    expect(
      screen.getByRole("group", { name: "Main pair for A1NS" }),
    ).toBeInTheDocument();

    // Switch to two lines → the Main pair control disappears (each occupant is
    // its own line with its own identity).
    const splitGroup = screen.getByRole("group", { name: "Split by board?" });
    fireEvent.click(within(splitGroup).getByText("Two lines"));
    expect(
      screen.queryByRole("group", { name: "Main pair for A1NS" }),
    ).not.toBeInTheDocument();
  });

  it("pre-fills the main pair from the stored choice", async () => {
    // Stored main pair is the EARLIER pair (id 1), not the anchor.
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[
          row({
            occupants: [
              {
                id: 2,
                pair: "Late One & Late Two",
                boardCount: 2,
                eligible: true,
                isArrivalAnchor: true,
                isMainPair: false,
              },
              {
                id: 1,
                pair: "Early One & Early Two",
                boardCount: 2,
                eligible: true,
                isArrivalAnchor: false,
                isMainPair: true,
              },
            ],
          }),
        ]}
      />,
    );

    // Saving without touching the control keeps the stored main pair (id 1).
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith("A1NS", {
        split: false,
        eligibility: [
          { id: 2, eligible: true },
          { id: 1, eligible: true },
        ],
        mainOccupancyId: 1,
      }),
    );
  });

  it("pre-fills from stored split + eligibility", async () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[
          row({
            split: true,
            occupants: [
              {
                id: 2,
                pair: "Late One & Late Two",
                boardCount: 2,
                eligible: true,
                isArrivalAnchor: true,
                isMainPair: true,
              },
              {
                id: 1,
                pair: "Early One & Early Two",
                boardCount: 2,
                eligible: false,
                isArrivalAnchor: false,
                isMainPair: false,
              },
            ],
          }),
        ]}
      />,
    );

    // Already split → per-occupant toggles visible immediately, with the
    // earlier pair's stored "not ranked" reflected.
    expect(
      screen.getByText("Early One & Early Two ranked?"),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith("A1NS", {
        split: true,
        eligibility: [
          { id: 2, eligible: true },
          { id: 1, eligible: false },
        ],
      }),
    );
  });

  it("warns (pairs, merged) that the sub loses NGS/Masterpoint credit to the main pair", () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        isPairs
        substitutions={[row()]}
      />,
    );

    // Default main = the arrival anchor (Late One & Late Two); the sub is the
    // earlier pair.
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent(
      "Early One & Early Two gets no NGS/Masterpoint credit — it all goes to Late One & Late Two.",
    );
  });

  it("flips the warning's named pairs when the main pair is re-pointed", () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        isPairs
        substitutions={[row()]}
      />,
    );

    // Re-point the main pair to the earlier pair → the warning's roles swap.
    const mainGroup = screen.getByRole("group", { name: "Main pair for A1NS" });
    fireEvent.click(within(mainGroup).getByText("Early One & Early Two"));

    expect(screen.getByRole("note")).toHaveTextContent(
      "Late One & Late Two gets no NGS/Masterpoint credit — it all goes to Early One & Early Two.",
    );
  });

  it("hides the warning when the seat is split", () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        isPairs
        substitutions={[row()]}
      />,
    );

    expect(screen.getByRole("note")).toBeInTheDocument();
    const splitGroup = screen.getByRole("group", { name: "Split by board?" });
    fireEvent.click(within(splitGroup).getByText("Two lines"));
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("does not warn for a teams event (credit goes to the team)", () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        isPairs={false}
        substitutions={[row()]}
      />,
    );
    // Merged by default, but teams → no NGS/Masterpoint warning.
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("surfaces a save error", async () => {
    onSave.mockRejectedValueOnce(new Error("network down"));
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("network down");
  });

  it("shows 'Saved' after a successful save", async () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        substitutions={[row()]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(
      await screen.findByRole("button", { name: "Saved" }),
    ).toBeInTheDocument();
  });

  it("renders a read-only list for a teams event (no toggles, no Save)", () => {
    render(
      <SubstitutionsPage
        onBack={onBack}
        onSave={onSave}
        isTeams
        isPairs={false}
        substitutions={[row()]}
      />,
    );
    expect(screen.getByText("A1NS")).toBeInTheDocument();
    expect(
      screen.getByText("Late One & Late Two — 2 boards"),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Save" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Split by board?")).not.toBeInTheDocument();
    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
