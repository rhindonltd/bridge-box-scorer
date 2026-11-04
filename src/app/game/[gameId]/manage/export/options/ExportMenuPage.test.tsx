import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    headerRight,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    headerRight?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {headerRight}
      {children}
    </div>
  ),
}));

import { ExportMenuPage } from "./ExportMenuPage";

const handlers = {
  onBack: vi.fn(),
  onDownloadUsebioClick: vi.fn(),
  onDownloadPbnClick: vi.fn(),
  onUploadBridgewebsClick: vi.fn(),
  onUploadEbuClick: vi.fn(),
};

const flags = {
  showDownloadUsebio: false,
  downloadUsebioDisabled: false,
  showDownloadPbn: false,
  showUploadBridgewebs: false,
  uploadBridgewebsDisabled: false,
  showUploadEbu: false,
  uploadEbuDisabled: false,
};

describe("ExportMenuPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the header and wires the back action", () => {
    render(<ExportMenuPage {...handlers} {...flags} />);
    expect(
      screen.getByRole("heading", { name: "Export & Publish" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(handlers.onBack).toHaveBeenCalled();
  });

  describe("Download USEBIO", () => {
    it("is hidden when showDownloadUsebio is false", () => {
      render(<ExportMenuPage {...handlers} {...flags} />);
      expect(
        screen.queryByRole("button", { name: "Download USEBIO" }),
      ).not.toBeInTheDocument();
    });

    it("is shown and enabled when results are in", () => {
      render(
        <ExportMenuPage
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

    it("is shown but disabled while results are incomplete", () => {
      render(
        <ExportMenuPage
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

  describe("Download PBN", () => {
    it("is shown and wired when showDownloadPbn is true", () => {
      render(<ExportMenuPage {...handlers} {...flags} showDownloadPbn={true} />);
      fireEvent.click(screen.getByRole("button", { name: "Download PBN" }));
      expect(handlers.onDownloadPbnClick).toHaveBeenCalled();
    });

    it("is hidden when showDownloadPbn is false", () => {
      render(<ExportMenuPage {...handlers} {...flags} />);
      expect(
        screen.queryByRole("button", { name: "Download PBN" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("Upload to BridgeWebs", () => {
    it("is hidden when showUploadBridgewebs is false", () => {
      render(<ExportMenuPage {...handlers} {...flags} />);
      expect(
        screen.queryByRole("button", { name: "Upload to BridgeWebs" }),
      ).not.toBeInTheDocument();
    });

    it("is shown and enabled when results are in", () => {
      render(
        <ExportMenuPage
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
        <ExportMenuPage
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

  describe("Submit to EBU", () => {
    it("is hidden when showUploadEbu is false", () => {
      render(<ExportMenuPage {...handlers} {...flags} />);
      expect(
        screen.queryByRole("button", { name: "Submit to EBU" }),
      ).not.toBeInTheDocument();
    });

    it("is shown and enabled when results are in", () => {
      render(
        <ExportMenuPage
          {...handlers}
          {...flags}
          showUploadEbu={true}
          uploadEbuDisabled={false}
        />,
      );
      const button = screen.getByRole("button", { name: "Submit to EBU" });
      expect(button).toBeEnabled();
      fireEvent.click(button);
      expect(handlers.onUploadEbuClick).toHaveBeenCalled();
    });

    it("is shown but disabled until all results are in", () => {
      render(
        <ExportMenuPage
          {...handlers}
          {...flags}
          showUploadEbu={true}
          uploadEbuDisabled={true}
        />,
      );
      const button = screen.getByRole("button", { name: "Submit to EBU" });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(handlers.onUploadEbuClick).not.toHaveBeenCalled();
    });
  });
});
