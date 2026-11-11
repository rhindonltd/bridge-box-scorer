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
  onManageTablesClick: vi.fn(),
  onTravellersClick: vi.fn(),
  onEnterDealsClick: vi.fn(),
  onMovementClick: vi.fn(),
  onTimerClick: vi.fn(),
  onReviewMismatchesClick: vi.fn(),
  onPairsClick: vi.fn(),
  onExportClick: vi.fn(),
  onDeleteGameClick: vi.fn(),
};

const flags = {
  showSetUpGame: false,
  showManageTables: false,
  showTravellers: false,
  showEnterDeals: false,
  showMovement: false,
  showTimer: false,
  showReviewMismatches: false,
  showPairs: false,
  showExport: false,
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
          showExport={false}
        />,
      );
    });

    it("shows Set Up Game and wires it", () => {
      fireEvent.click(screen.getByRole("button", { name: "Set Up Game" }));
      expect(handlers.onSetUpGameClick).toHaveBeenCalled();
    });

    it("hides Travellers, Movement and Export & Publish", () => {
      expect(
        screen.queryByRole("button", { name: "Travellers" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Movement" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Export & Publish" }),
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
          showExport={false}
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

  describe("Enter Deals", () => {
    it("is shown and wired when showEnterDeals is true", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showEnterDeals={true} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Enter Deals" }));
      expect(handlers.onEnterDealsClick).toHaveBeenCalled();
    });

    it("is hidden when showEnterDeals is false", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showEnterDeals={false} />,
      );
      expect(
        screen.queryByRole("button", { name: "Enter Deals" }),
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

  describe("Manage Tables", () => {
    it("is shown and wired when showManageTables is true", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showManageTables={true} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Manage Tables" }));
      expect(handlers.onManageTablesClick).toHaveBeenCalled();
    });
    it("is hidden when showManageTables is false", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} />);
      expect(
        screen.queryByRole("button", { name: "Manage Tables" }),
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

  describe("Export & Publish", () => {
    it("is shown and wired when showExport is true", () => {
      render(<ManageGameMenuPage {...handlers} {...flags} showExport={true} />);
      fireEvent.click(screen.getByRole("button", { name: "Export & Publish" }));
      expect(handlers.onExportClick).toHaveBeenCalled();
    });

    it("is hidden when showExport is false", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showExport={false} />,
      );
      expect(
        screen.queryByRole("button", { name: "Export & Publish" }),
      ).not.toBeInTheDocument();
    });
  });
});
