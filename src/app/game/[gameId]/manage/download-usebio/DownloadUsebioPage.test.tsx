import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let swrState: { data: unknown; isLoading: boolean };

vi.mock("swr", () => ({
  default: () => ({
    data: swrState.data,
    isLoading: swrState.isLoading,
  }),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

vi.mock("@/swr/swr-keys", () => ({
  swrKeys: { club: () => "/api/system/club" },
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" } }),
}));

vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => "director-tok",
}));

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

import { DownloadUsebioPage } from "./DownloadUsebioPage";

const CONFIGURED_CLUB = { name: "Fetched Club", clubNumber: "999" };

describe("DownloadUsebioPage", () => {
  let clickSpy: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    swrState = { data: { club: CONFIGURED_CLUB }, isLoading: false };

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:url"),
      revokeObjectURL: vi.fn(),
    });

    clickSpy = vi.fn<() => void>();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a loading spinner while the club record loads", () => {
    swrState = { data: undefined, isLoading: true };
    const { container } = render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows the configured club details read-only", () => {
    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByTestId("usebio-club-name")).toHaveTextContent(
      "Fetched Club",
    );
    expect(screen.getByTestId("usebio-club-number")).toHaveTextContent("999");
    // No editable inputs — club info is configured in Settings.
    expect(screen.queryByLabelText("Club Name")).toBeNull();
  });

  it("blocks download and points to Settings when club is not configured", () => {
    swrState = { data: { club: null }, isLoading: false };
    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /must be set in Settings/i,
    );
    expect(
      screen.getByRole("button", { name: "Download USEBIO" }),
    ).toBeDisabled();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("downloads the USEBIO file with the director token header on success", async () => {
    const blob = new Blob(["<xml/>"], { type: "application/xml" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h: string) =>
          h === "Content-Disposition"
            ? 'attachment; filename="game-results.xml"'
            : null,
      },
      blob: async () => blob,
    });
    vi.stubGlobal("fetch", fetchMock);
    const onUsebioDownloaded = vi.fn();

    render(
      <DownloadUsebioPage
        onUsebioDownloaded={onUsebioDownloaded}
        onCancel={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    await waitFor(() => expect(onUsebioDownloaded).toHaveBeenCalled());
    // Only the USEBIO GET is made (no club POST); the director token is sent.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/usebio",
      expect.objectContaining({
        headers: { "x-director-token": "director-tok" },
      }),
    );
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("shows the server error when USEBIO generation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No results yet" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No results yet");
  });

  it("shows a network error if the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    );
  });
});
