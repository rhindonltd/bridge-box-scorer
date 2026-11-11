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
  swrKeys: { ebu: () => "/api/system/ebu" },
}));

const mockMutateGame = vi.fn();
let gameLevel: string | null = "NORMAL_CLUB";
vi.mock("@/context/GameContext", () => ({
  useRequiredGame: () => ({
    game: { gameId: "g1", tournamentLevel: gameLevel },
    mutateGame: mockMutateGame,
  }),
}));

const mockGetDirectorToken = vi.fn(() => "director-tok" as string | null);
vi.mock("@/lib/director-token", () => ({
  getDirectorToken: () => mockGetDirectorToken(),
}));

vi.mock("@/components/layout/GamePageLayout", () => ({
  GamePageLayout: ({
    headerTitle,
    backAction,
    actions,
    children,
  }: {
    headerTitle: string;
    backAction?: () => void;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      {backAction && (
        <button aria-label="Go back" onClick={backAction}>
          back
        </button>
      )}
      <h1>{headerTitle}</h1>
      {children}
      <div>{actions}</div>
    </div>
  ),
}));

import { UploadEbuPage } from "./UploadEbuPage";

describe("UploadEbuPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameLevel = "NORMAL_CLUB";
    mockGetDirectorToken.mockReturnValue("director-tok");
    swrState = {
      data: { configured: true, ebuNumber: "123456" },
      isLoading: false,
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a spinner while the status loads", () => {
    swrState = { data: undefined, isLoading: true };
    const { container } = render(<UploadEbuPage onCancel={vi.fn()} />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("disables upload and points to Settings when not configured", () => {
    swrState = { data: { configured: false, ebuNumber: null }, isLoading: false };
    render(<UploadEbuPage onCancel={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent(/not configured/i);
    expect(
      screen.getByRole("button", { name: "Submit to EBU" }),
    ).toBeDisabled();
  });

  it("calls onCancel when the header back arrow is clicked", () => {
    const onCancel = vi.fn();
    render(<UploadEbuPage onCancel={onCancel} />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows the EBU success message after uploading", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        result: { ok: true, message: "Submission accepted" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Submission accepted",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/ebu/upload",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-director-token": "director-tok" }),
        body: JSON.stringify({ tournamentLevel: "NORMAL_CLUB" }),
      }),
    );
  });

  it("shows the EBU error message when the reply is not ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        result: { ok: false, message: "Invalid password" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid password",
    );
  });

  it("shows the server error on a non-ok HTTP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Not allowed." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Not allowed.",
    );
  });

  it("sends an empty token header when no director token is present", async () => {
    mockGetDirectorToken.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: true, message: "done" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    await screen.findByRole("status");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/games/g1/ebu/upload",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-director-token": "" }),
      }),
    );
  });

  it("falls back to a generic success message when the reply omits one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: true } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Submission successful",
    );
  });

  it("falls back to a generic failure message when the reply omits one", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: false } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Submission failed");
  });

  it("handles a malformed JSON body on an ok response (falls back to failed)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error("not json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    // body is null -> body?.result?.ok is falsy -> generic "Submission failed".
    expect(await screen.findByRole("alert")).toHaveTextContent("Submission failed");
  });

  it("shows a generic error when a non-ok response has no error field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Submission failed. Please try again.",
    );
  });

  it("omits the club name from the blurb when configured without a club", () => {
    swrState = { data: { configured: true, ebuNumber: null }, isLoading: false };
    render(<UploadEbuPage onCancel={vi.fn()} />);
    // Configured, so the descriptive blurb shows, but with no `for club "..."`.
    expect(screen.getByText(/submits the game results/i)).toBeInTheDocument();
    expect(screen.queryByText(/for EBU number/i)).not.toBeInTheDocument();
  });

  it("shows a network error if the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(
      screen.getByRole("button", { name: "Submit to EBU" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Network error. Please try again.",
    );
  });
  it("shows the EBU number in the blurb when known", () => {
    render(<UploadEbuPage onCancel={vi.fn()} />);
    expect(screen.getByText(/for EBU number 123456/)).toBeInTheDocument();
  });
  it("saves the chosen level locally after a successful submission", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: true, message: "done" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit to EBU" }));
    await screen.findByRole("status");
    expect(mockMutateGame).toHaveBeenCalledWith(
      expect.objectContaining({ gameId: "g1" }),
      false,
    );
  });
  it("lists advisories returned with a success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { ok: true, message: "done", advisories: ["Check level"] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit to EBU" }));
    expect(await screen.findByText("Check level")).toBeInTheDocument();
  });
  it("lists advisories returned with a failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: { ok: false, message: "bad", advisories: ["Fix it"] },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit to EBU" }));
    expect(await screen.findByText("Fix it")).toBeInTheDocument();
  });
  it("defaults the tournament level when the game has none saved", async () => {
    gameLevel = null;
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ result: { ok: true, message: "done" } }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<UploadEbuPage onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Submit to EBU" }));
    await screen.findByRole("status");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).tournamentLevel).toBeTruthy();
  });
});
