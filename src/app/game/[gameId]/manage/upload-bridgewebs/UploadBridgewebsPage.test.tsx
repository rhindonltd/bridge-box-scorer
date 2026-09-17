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

import { UploadBridgewebsPage } from "./UploadBridgewebsPage";

describe("UploadBridgewebsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
