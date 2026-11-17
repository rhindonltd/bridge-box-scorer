import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

let swrData: unknown;
vi.mock("swr", () => ({ default: () => ({ data: swrData }) }));
vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

const mockIsDirector = vi.fn();
vi.mock("@/hooks/use-is-director", () => ({
  useIsDirector: () => mockIsDirector(),
}));

vi.mock("@/app/game/[gameId]/export/ExportDirectorSection", () => ({
  ExportDirectorSection: () => <span data-testid="director-section" />,
}));
vi.mock("@/app/game/[gameId]/export/ExportGamePage", () => ({
  ExportGamePage: ({
    onDownloadUsebioClick,
    onDownloadPbnClick,
    showClubWarning,
    directorSection,
  }: {
    onDownloadUsebioClick: () => void;
    onDownloadPbnClick: () => void;
    showClubWarning: boolean;
    directorSection?: React.ReactNode;
  }) => (
    <div>
      <button onClick={onDownloadUsebioClick}>usebio</button>
      <button onClick={onDownloadPbnClick}>pbn</button>
      <span data-testid="warn">{String(showClubWarning)}</span>
      {directorSection}
    </div>
  ),
}));

import { ExportGame } from "./ExportGame";

describe("ExportGame", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsDirector.mockReturnValue(false);
    swrData = { club: { name: "Club", clubNumber: "1" } };
  });

  it("routes to the download pages", () => {
    render(<ExportGame gameId="g1" />);
    fireEvent.click(screen.getByText("usebio"));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/export/download-usebio");
    fireEvent.click(screen.getByText("pbn"));
    expect(mockPush).toHaveBeenCalledWith("/game/g1/export/download-pbn");
  });

  it("warns a director when the club is not configured", () => {
    mockIsDirector.mockReturnValue(true);
    swrData = { club: null };
    render(<ExportGame gameId="g1" />);
    expect(screen.getByTestId("warn")).toHaveTextContent("true");
  });

  it("does not warn a non-director, or while the club is loading", () => {
    swrData = { club: null };
    const { rerender } = render(<ExportGame gameId="g1" />);
    expect(screen.getByTestId("warn")).toHaveTextContent("false");
    mockIsDirector.mockReturnValue(true);
    swrData = undefined;
    rerender(<ExportGame gameId="g1" />);
    expect(screen.getByTestId("warn")).toHaveTextContent("false");
  });

  it("shows the director section only on a director's device", () => {
    const { rerender } = render(<ExportGame gameId="g1" />);
    expect(screen.queryByTestId("director-section")).toBeNull();
    mockIsDirector.mockReturnValue(true);
    rerender(<ExportGame gameId="g1" />);
    expect(screen.getByTestId("director-section")).toBeInTheDocument();
  });
});
