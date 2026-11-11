import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

let swrState: { data: unknown; isLoading: boolean };
const mockMutate = vi.fn();
vi.mock("swr", () => ({
  default: () => ({
    data: swrState.data,
    isLoading: swrState.isLoading,
    mutate: mockMutate,
  }),
}));
vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));
vi.mock("@/swr/swr-keys", () => ({
  swrKeys: {
    cloudSyncStatus: () => "/api/system/cloud-sync/status",
    cloudSync: () => "/api/system/cloud-sync",
  },
}));

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

const mockGetAdminToken = vi.fn();
const mockClearAdminToken = vi.fn();
vi.mock("@/lib/admin-token", () => ({
  getAdminToken: () => mockGetAdminToken(),
  clearAdminToken: () => mockClearAdminToken(),
}));

import { CloudSyncSettingsPage } from "./CloudSyncSettingsPage";

const enabledStatus = {
  enabled: true,
  backup: { last_success: null, last_attempt: null, last_result: null },
  logs: { last_success: null, last_attempt: null, last_result: null },
};

function pressBackUp() {
  fireEvent.click(screen.getByRole("button", { name: "Back up now" }));
}

describe("CloudSyncSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState = { data: enabledStatus, isLoading: false };
    mockGetAdminToken.mockReturnValue("admin-tok");
    mockMutate.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a spinner while loading", () => {
    swrState = { data: undefined, isLoading: true };
    const { container } = render(<CloudSyncSettingsPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows a spinner while there is no status yet", () => {
    swrState = { data: undefined, isLoading: false };
    const { container } = render(<CloudSyncSettingsPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("navigates back", () => {
    render(<CloudSyncSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(mockBack).toHaveBeenCalled();
  });

  it("starts a backup, refreshes the status and debounces the button", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<CloudSyncSettingsPage />);
    pressBackUp();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("✅ Backup started")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/cloud-sync",
      expect.objectContaining({
        method: "POST",
        headers: { "x-admin-token": "admin-tok" },
      }),
    );
    expect(mockMutate).toHaveBeenCalled();
    // Still disabled during the debounce window, re-enabled afterwards.
    expect(screen.getByRole("button", { name: "Backing up..." })).toBeDisabled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(screen.getByRole("button", { name: "Back up now" })).toBeEnabled();
  });

  it("sends an empty token header when no admin token is stored", async () => {
    mockGetAdminToken.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    render(<CloudSyncSettingsPage />);
    pressBackUp();
    await screen.findByText("✅ Backup started");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/cloud-sync",
      expect.objectContaining({ headers: { "x-admin-token": "" } }),
    );
  });

  it("clears the admin token and prompts to re-enter it on a 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    render(<CloudSyncSettingsPage />);
    pressBackUp();
    expect(
      await screen.findByText("Session expired. Please re-enter the admin key."),
    ).toBeInTheDocument();
    expect(mockClearAdminToken).toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows the server error message on another failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: "Backup unavailable" }),
      }),
    );
    render(<CloudSyncSettingsPage />);
    pressBackUp();
    expect(await screen.findByText("Backup unavailable")).toBeInTheDocument();
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("not json");
        },
      }),
    );
    render(<CloudSyncSettingsPage />);
    pressBackUp();
    expect(await screen.findByText("Failed to start backup")).toBeInTheDocument();
  });

  it("shows a network error if the request throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<CloudSyncSettingsPage />);
    pressBackUp();
    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });
});
