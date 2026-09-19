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

const mockGetDirectorToken = vi.fn(() => "director-tok" as string | null);
vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => mockGetDirectorToken(),
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

import { DownloadPbnPage } from "./DownloadPbnPage";

// The club must have BOTH a name and an EBU number to be "configured"; the club
// name is written into the PBN Site tag.
const CONFIGURED_CLUB = { name: "Fetched Club", clubNumber: "999" };

describe("DownloadPbnPage", () => {
  let clickSpy: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDirectorToken.mockReturnValue("director-tok");
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
      <DownloadPbnPage onPbnDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows the configured club name read-only", () => {
    render(<DownloadPbnPage onPbnDownloaded={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByTestId("pbn-club-name")).toHaveTextContent(
      "Fetched Club",
    );
    // Club info is read-only here — configured in Settings.
    expect(screen.queryByLabelText("Club Name")).toBeNull();
  });

  it("blocks download and points to Settings when club is not configured", () => {
    swrState = { data: { club: null }, isLoading: false };
    render(<DownloadPbnPage onPbnDownloaded={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/must be set in Settings/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download PBN" })).toBeDisabled();
  });

  it("treats a club missing its EBU number as not configured", () => {
    swrState = {
      data: { club: { name: "No Number Club", clubNumber: "" } },
      isLoading: false,
    };
    render(<DownloadPbnPage onPbnDownloaded={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Download PBN" })).toBeDisabled();
    expect(screen.getByText(/must be set in Settings/i)).toBeInTheDocument();
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(<DownloadPbnPage onPbnDownloaded={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows the guard error if the form is submitted while unconfigured", async () => {
    swrState = { data: { club: null }, isLoading: false };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const onPbnDownloaded = vi.fn();

    const { container } = render(
      <DownloadPbnPage onPbnDownloaded={onPbnDownloaded} onCancel={vi.fn()} />,
    );

    // The button is disabled, but a direct form submit still hits the guard,
    // which sets the error and short-circuits before any fetch.
    fireEvent.submit(container.querySelector("#download-pbn-form")!);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /must be set in Settings/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
    expect(onPbnDownloaded).not.toHaveBeenCalled();
  });

  it("downloads the PBN file with the director token header on success", async () => {
    const blob = new Blob(["[Event ...]"], { type: "application/x-pbn" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (h: string) =>
          h === "Content-Disposition"
            ? 'attachment; filename="game-deals.pbn"'
            : null,
      },
      blob: async () => blob,
    });
    vi.stubGlobal("fetch", fetchMock);
    const onPbnDownloaded = vi.fn();

    render(
      <DownloadPbnPage onPbnDownloaded={onPbnDownloaded} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PBN" }));

    await waitFor(() => expect(onPbnDownloaded).toHaveBeenCalled());
    // The PBN GET is director-authed via the x-director-token header.
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/pbn",
      expect.objectContaining({
        headers: { "x-director-token": "director-tok" },
      }),
    );
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
  });

  it("falls back to a default filename and empty token when both are absent", async () => {
    mockGetDirectorToken.mockReturnValue(null);
    const blob = new Blob(["[Event ...]"], { type: "application/x-pbn" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      // No Content-Disposition header -> filename falls back to results.pbn.
      headers: { get: () => null },
      blob: async () => blob,
    });
    vi.stubGlobal("fetch", fetchMock);
    const onPbnDownloaded = vi.fn();

    render(
      <DownloadPbnPage onPbnDownloaded={onPbnDownloaded} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download PBN" }));

    await waitFor(() => expect(onPbnDownloaded).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/pbn",
      expect.objectContaining({ headers: { "x-director-token": "" } }),
    );
    expect(clickSpy).toHaveBeenCalled();
  });

  it("shows a generic error when PBN generation fails with no error body", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new Error("not json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DownloadPbnPage onPbnDownloaded={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Download PBN" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to generate PBN file",
    );
  });

  it("shows the server error when PBN generation fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "No deals entered" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DownloadPbnPage onPbnDownloaded={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Download PBN" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No deals entered",
    );
  });

  it("shows a network error if the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<DownloadPbnPage onPbnDownloaded={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Download PBN" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    );
  });
});
