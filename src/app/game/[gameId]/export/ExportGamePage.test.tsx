import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backHref,
    children,
  }: {
    headerTitle: string;
    backHref?: string;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{headerTitle}</h1>
      <span data-testid="back">{backHref}</span>
      {children}
    </div>
  ),
}));

import { ExportGamePage } from "./ExportGamePage";

const handlers = {
  onDownloadUsebioClick: vi.fn(),
  onDownloadPbnClick: vi.fn(),
};

describe("ExportGamePage", () => {
  it("offers both downloads and goes back to the Export Game list", () => {
    render(<ExportGamePage {...handlers} showClubWarning={false} />);
    expect(screen.getByText("Export Game")).toBeInTheDocument();
    expect(screen.getByTestId("back")).toHaveTextContent("/export");
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));
    expect(handlers.onDownloadUsebioClick).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Download PBN" }));
    expect(handlers.onDownloadPbnClick).toHaveBeenCalled();
  });

  it("shows the club warning only when asked", () => {
    const { rerender } = render(
      <ExportGamePage {...handlers} showClubWarning={false} />,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    rerender(<ExportGamePage {...handlers} showClubWarning />);
    expect(screen.getByRole("alert")).toHaveTextContent(/Settings/);
  });

  it("renders the director section when given one", () => {
    render(
      <ExportGamePage
        {...handlers}
        showClubWarning={false}
        directorSection={<button>Reopen game</button>}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Reopen game" }),
    ).toBeInTheDocument();
  });
});
