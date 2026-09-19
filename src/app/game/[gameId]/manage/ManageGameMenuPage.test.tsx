import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    children,
  }: {
    headerTitle: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
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
  onShareDirectorAccessClick: vi.fn(),
  onDownloadUsebioClick: vi.fn(),
  onDownloadPbnClick: vi.fn(),
  onUploadBridgewebsClick: vi.fn(),
  onDeleteGameClick: vi.fn(),
};

const flags = {
  showSetUpGame: false,
  showTravellers: false,
  showEnterDeals: false,
  showMovement: false,
  showDownloadUsebio: false,
  downloadUsebioDisabled: false,
  showDownloadPbn: false,
  showUploadBridgewebs: false,
  uploadBridgewebsDisabled: false,
};

describe("ManageGameMenuPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always shows Share Director Access and Delete Game and wires them", () => {
    render(<ManageGameMenuPage {...handlers} {...flags} />);

    expect(
      screen.getByRole("heading", { name: "Manage Game Menu" }),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Share Director Access" }),
    );
    expect(handlers.onShareDirectorAccessClick).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Delete Game" }));
    expect(handlers.onDeleteGameClick).toHaveBeenCalled();
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
          showDownloadUsebio={false}
        />,
      );
    });

    it("shows Set Up Game and wires it", () => {
      fireEvent.click(screen.getByRole("button", { name: "Set Up Game" }));
      expect(handlers.onSetUpGameClick).toHaveBeenCalled();
    });

    it("hides Travellers, Movement and Download USEBIO", () => {
      expect(
        screen.queryByRole("button", { name: "Travellers" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Movement" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Download USEBIO" }),
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
          showDownloadUsebio={false}
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

  describe("Download PBN", () => {
    it("is shown and wired when showDownloadPbn is true", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showDownloadPbn={true} />,
      );
      fireEvent.click(screen.getByRole("button", { name: "Download PBN" }));
      expect(handlers.onDownloadPbnClick).toHaveBeenCalled();
    });

    it("is hidden when showDownloadPbn is false", () => {
      render(
        <ManageGameMenuPage {...handlers} {...flags} showDownloadPbn={false} />,
      );
      expect(
        screen.queryByRole("button", { name: "Download PBN" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Download USEBIO", () => {
    it("is hidden when showDownloadUsebio is false", () => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showDownloadUsebio={false}
        />,
      );
      expect(
        screen.queryByRole("button", { name: "Download USEBIO" }),
      ).not.toBeInTheDocument();
    });

    it("is shown and enabled when results are in", () => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showDownloadUsebio={true}
          downloadUsebioDisabled={false}
        />,
      );
      const button = screen.getByRole("button", { name: "Download USEBIO" });
      expect(button).toBeEnabled();

      fireEvent.click(button);
      expect(handlers.onDownloadUsebioClick).toHaveBeenCalled();
    });

    it("is shown but disabled while the completion signal is loading", () => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showDownloadUsebio={true}
          downloadUsebioDisabled={true}
        />,
      );
      const button = screen.getByRole("button", { name: "Download USEBIO" });
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(handlers.onDownloadUsebioClick).not.toHaveBeenCalled();
    });
  });

  describe("Upload to BridgeWebs", () => {
    it("is hidden when showUploadBridgewebs is false", () => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showUploadBridgewebs={false}
        />,
      );
      expect(
        screen.queryByRole("button", { name: "Upload to BridgeWebs" }),
      ).not.toBeInTheDocument();
    });

    it("is shown and enabled when results are in", () => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showUploadBridgewebs={true}
          uploadBridgewebsDisabled={false}
        />,
      );
      const button = screen.getByRole("button", {
        name: "Upload to BridgeWebs",
      });
      expect(button).toBeEnabled();

      fireEvent.click(button);
      expect(handlers.onUploadBridgewebsClick).toHaveBeenCalled();
    });

    it("is shown but disabled until all results are in", () => {
      render(
        <ManageGameMenuPage
          {...handlers}
          {...flags}
          showUploadBridgewebs={true}
          uploadBridgewebsDisabled={true}
        />,
      );
      const button = screen.getByRole("button", {
        name: "Upload to BridgeWebs",
      });
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(handlers.onUploadBridgewebsClick).not.toHaveBeenCalled();
    });
  });
});
