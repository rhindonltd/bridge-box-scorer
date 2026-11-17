import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    headerRight,
    children,
  }: {
    headerTitle: string;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      {headerRight}
      {children}
    </div>
  ),
}));

import { ManageGameMenuPage } from "./ManageGameMenuPage";

const handlers = {
  onSetUpGameClick: vi.fn(),
  onTravellersClick: vi.fn(),
  onEnterDealsClick: vi.fn(),
  onMovementClick: vi.fn(),
  onTimerClick: vi.fn(),
  onReviewMismatchesClick: vi.fn(),
  onPairsClick: vi.fn(),
  onTeamsClick: vi.fn(),
  onFinaliseClick: vi.fn(),
  onDeleteGameClick: vi.fn(),
};

const flags = {
  showSetUpGame: false,
  showTravellers: false,
  showEnterDeals: false,
  showMovement: false,
  showTimer: false,
  showReviewMismatches: false,
  showPairs: false,
  showTeams: false,
  showFinalise: false,
};

describe("ManageGameMenuPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always shows Delete Game and wires it", () => {
    render(<ManageGameMenuPage {...handlers} {...flags} />);

    expect(
      screen.getByRole("heading", { name: "Manage Game Menu" }),
    ).toBeInTheDocument();

    // Share Director Access moved to the header hamburger, so the menu body no
    // longer offers it.
    expect(
      screen.queryByRole("button", { name: "Share Director Access" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Delete Game" }));
    expect(handlers.onDeleteGameClick).toHaveBeenCalled();
  });

  it("renders the header-right switch when provided", () => {
    render(
      <ManageGameMenuPage
        {...handlers}
        {...flags}
        headerRight={<div data-testid="manage-switch" />}
      />,
    );
    expect(screen.getByTestId("manage-switch")).toBeInTheDocument();
  });

  describe("before the game has started", () => {
    beforeEach(() => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showSetUpGame={true}
          showTravellers={false}
          showMovement={false}
          showFinalise={false}
        />,
      );
    });

    it("shows Set Up Game and wires it", () => {
      fireEvent.click(screen.getByRole("button", { name: "Set Up Game" }));
      expect(handlers.onSetUpGameClick).toHaveBeenCalled();
    });

    it("hides Travellers, Movement and Finalise Game", () => {
      expect(
        screen.queryByRole("button", { name: "Travellers" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Movement" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Finalise Game" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("after the game has started", () => {
    beforeEach(() => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showSetUpGame={false}
          showTravellers={true}
          showMovement={true}
          showFinalise={false}
        />,
      );
    });

    it("shows Travellers and Movement and wires them", () => {
      fireEvent.click(screen.getByRole("button", { name: "Travellers" }));
      expect(handlers.onTravellersClick).toHaveBeenCalled();

      fireEvent.click(screen.getByRole("button", { name: "Movement" }));
      expect(handlers.onMovementClick).toHaveBeenCalled();
    });

    it("hides Set Up Game", () => {
      expect(
        screen.queryByRole("button", { name: "Set Up Game" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Deals", () => {
    it("is shown and wired when showEnterDeals is true", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showEnterDeals={true} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Deals" }));
      expect(handlers.onEnterDealsClick).toHaveBeenCalled();
    });

    it("is hidden when showEnterDeals is false", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showEnterDeals={false} />,
      );
      expect(
        screen.queryByRole("button", { name: "Deals" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Timer", () => {
    it("is shown and wired when showTimer is true", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} showTimer={true} />);
      fireEvent.click(screen.getByRole("button", { name: "Timer" }));
      expect(handlers.onTimerClick).toHaveBeenCalled();
    });

    it("is hidden when showTimer is false", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} showTimer={false} />);
      expect(
        screen.queryByRole("button", { name: "Timer" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Teams", () => {
    it("is shown and wired when showTeams is true", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} showTeams={true} />);
      fireEvent.click(screen.getByRole("button", { name: "Teams" }));
      expect(handlers.onTeamsClick).toHaveBeenCalled();
    });
    it("is hidden when showTeams is false", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} />);
      expect(
        screen.queryByRole("button", { name: "Teams" }),
      ).not.toBeInTheDocument();
    });
  });
  describe("Review Mismatches", () => {
    it("is shown and wired when showReviewMismatches is true", () => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showReviewMismatches={true}
        />,
      );
      fireEvent.click(
        screen.getByRole("button", { name: "Review Mismatches" }),
      );
      expect(handlers.onReviewMismatchesClick).toHaveBeenCalled();
    });
    it("is hidden when showReviewMismatches is false", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} />);
      expect(
        screen.queryByRole("button", { name: "Review Mismatches" }),
      ).not.toBeInTheDocument();
    });
  });
  describe("Pairs", () => {
    it("is shown and wired when showPairs is true", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} showPairs={true} />);
      fireEvent.click(screen.getByRole("button", { name: "Pairs" }));
      expect(handlers.onPairsClick).toHaveBeenCalled();
    });

    it("is hidden when showPairs is false", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} showPairs={false} />);
      expect(
        screen.queryByRole("button", { name: "Pairs" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Finalise Game", () => {
    it("is shown and wired when showFinalise is true", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showFinalise={true} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Finalise Game" }));
      expect(handlers.onFinaliseClick).toHaveBeenCalled();
    });

    it("is hidden when showFinalise is false", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showFinalise={false} />,
      );
      expect(
        screen.queryByRole("button", { name: "Finalise Game" }),
      ).not.toBeInTheDocument();
    });
  });
});
