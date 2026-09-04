import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockMutate = vi.fn();
let swrState: { data: unknown; isLoading: boolean };

vi.mock("swr", () => ({
  default: () => ({
    data: swrState.data,
    isLoading: swrState.isLoading,
    mutate: mockMutate,
  }),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

vi.mock("@/swr/swr-keys", () => ({
  swrKeys: { club: () => "/api/system/club" },
}));

vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({ game: { gameId: "g1" } }),
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

describe("DownloadUsebioPage", () => {
  let clickSpy: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.clearAllMocks();
    swrState = { data: { club: null }, isLoading: false };
    mockMutate.mockResolvedValue(undefined);

    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:url"),
      revokeObjectURL: vi.fn(),
    });

    // Spy on anchor click so the jsdom navigation doesn't error.
    clickSpy = vi.fn<() => void>();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(clickSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function fillForm() {
    fireEvent.change(screen.getByLabelText("Club Name"), {
      target: { value: "Anytown BC" },
    });
    fireEvent.change(screen.getByLabelText("EBU Club Number"), {
      target: { value: "12345" },
    });
  }

  it("shows a loading spinner while the club record loads", () => {
    swrState = { data: undefined, isLoading: true };
    const { container } = render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("prefills inputs from the fetched club record", () => {
    swrState = {
      data: { club: { name: "Fetched Club", clubNumber: "999" } },
      isLoading: false,
    };
    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    expect(screen.getByLabelText("Club Name")).toHaveValue("Fetched Club");
    expect(screen.getByLabelText("EBU Club Number")).toHaveValue("999");
  });

  it("calls onCancel when Cancel is clicked", () => {
    const onCancel = vi.fn();
    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={onCancel} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("validates that both fields are required", async () => {
    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Both club name and number are required",
    );
  });

  it("shows an error if saving club info fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to save club info",
    );
  });

  it("shows the server error when USEBIO generation fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true }) // save club
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "No results yet" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No results yet",
    );
    expect(mockMutate).toHaveBeenCalled();
  });

  it("falls back to a default error when USEBIO json is unparseable", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true }) // save club
      .mockResolvedValueOnce({
        ok: false,
        json: async () => {
          throw new Error("bad json");
        },
      });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Failed to generate USEBIO file",
    );
  });

  it("downloads with the filename from Content-Disposition on success", async () => {
    const blob = new Blob(["<xml/>"], { type: "application/xml" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true }) // save club
      .mockResolvedValueOnce({
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
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    await waitFor(() => expect(onUsebioDownloaded).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalledWith(blob);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:url");
  });

  it("uses the default filename when Content-Disposition is missing", async () => {
    const blob = new Blob(["<xml/>"]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: () => null },
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
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    await waitFor(() => expect(onUsebioDownloaded).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
  });

  it("shows a network error if a request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(
      <DownloadUsebioPage onUsebioDownloaded={vi.fn()} onCancel={vi.fn()} />,
    );
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: "Download USEBIO" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    );
  });
});
