import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let swrState: { data: unknown; isLoading: boolean };

vi.mock("swr", () => ({
  default: () => ({
    data: swrState.data,
    isLoading: swrState.isLoading,
  }),
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

vi.mock("@/swr/swr-keys", () => ({
  swrKeys: { bridgewebs: () => "/api/system/bridgewebs" },
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

import { UploadBridgewebsPage } from "./UploadBridgewebsPage";

describe("UploadBridgewebsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDirectorToken.mockReturnValue("director-tok");
    swrState = {
      data: { configured: true, club: "myclub" },
      isLoading: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a spinner while the status loads", () => {
    swrState = { data: undefined, isLoading: true };
    const { container } = render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("disables upload and points to Settings when not configured", () => {
    swrState = { data: { configured: false, club: null }, isLoading: false };
    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/not configured/i);
    expect(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    ).toBeDisabled();
  });

  it("calls onCancel when Back is clicked", () => {
    const onCancel = vi.fn();
    render(<UploadBridgewebsPage onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows the BridgeWebs success message after uploading", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        result: { ok: true, message: "Upload Successful" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Upload Successful",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/bridgewebs/upload",
      expect.objectContaining({
        method: "POST",
        headers: { "x-director-token": "director-tok" },
      }),
    );
  });

  it("shows the BridgeWebs error message when the reply is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        result: { ok: false, message: "Invalid password" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid password",
    );
  });

  it("shows the server error on a non-ok HTTP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Club info not configured." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Club info not configured.",
    );
  });

  it("sends an empty token header when no director token is present", async () => {
    mockGetDirectorToken.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: true, message: "done" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    await screen.findByRole("status");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/bridgewebs/upload",
      expect.objectContaining({ headers: { "x-director-token": "" } }),
    );
  });

  it("falls back to a generic success message when the reply omits one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Upload successful",
    );
  });

  it("falls back to a generic failure message when the reply omits one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed");
  });

  it("handles a malformed JSON body on an ok response (falls back to failed)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("not json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    // body is null -> body?.result?.ok is falsy -> generic "Upload failed".
    expect(await screen.findByRole("alert")).toHaveTextContent("Upload failed");
  });

  it("shows a generic error when a non-ok response has no error field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Upload failed. Please try again.",
    );
  });

  it("omits the club name from the blurb when configured without a club", () => {
    swrState = { data: { configured: true, club: null }, isLoading: false };
    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    // Configured, so the descriptive blurb shows, but with no `for club "..."`.
    expect(screen.getByText(/uploads the game results/i)).toBeInTheDocument();
    expect(screen.queryByText(/for club "/i)).not.toBeInTheDocument();
  });

  it("shows a network error if the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadBridgewebsPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Upload to BridgeWebs" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    );
  });
});
