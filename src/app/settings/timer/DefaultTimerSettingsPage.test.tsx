import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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
  swrKeys: { defaultTimer: () => "/api/system/default-timer" },
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

import { DefaultTimerSettingsPage } from "./DefaultTimerSettingsPage";

// 7:30 per board, 1:30 changeover.
const STORED = {
  settings: {
    playSecondsPerBoard: 450,
    moveSeconds: 90,
    timingMode: "perBoard" as const,
    warningSeconds: 60,
  },
};

describe("DefaultTimerSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState = { data: STORED, isLoading: false };
    mockGetAdminToken.mockReturnValue("admin-tok");
    mockMutate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a spinner while the settings load", () => {
    swrState = { data: undefined, isLoading: true };
    const { container } = render(<DefaultTimerSettingsPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("prefills minutes and seconds from the stored durations", () => {
    render(<DefaultTimerSettingsPage />);
    expect(screen.getByLabelText("Play minutes")).toHaveValue(7);
    expect(screen.getByLabelText("Play seconds")).toHaveValue(30);
    expect(screen.getByLabelText("Move minutes")).toHaveValue(1);
    expect(screen.getByLabelText("Move seconds")).toHaveValue(30);
  });

  it("saves the recombined seconds with the admin token and revalidates", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<DefaultTimerSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByText("✅ Default timer saved")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/default-timer",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({ "x-admin-token": "admin-tok" }),
        body: JSON.stringify({
          playSecondsPerBoard: 450,
          moveSeconds: 90,
          warningSeconds: 60,
        }),
      }),
    );
    expect(mockMutate).toHaveBeenCalled();
  });

  it("recombines edited minutes/seconds into whole seconds on save", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<DefaultTimerSettingsPage />);
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "8" },
    });
    fireEvent.change(screen.getByLabelText("Play seconds"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Move minutes"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByLabelText("Move seconds"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/default-timer",
      expect.objectContaining({
        body: JSON.stringify({
          playSecondsPerBoard: 480,
          moveSeconds: 120,
          warningSeconds: 60,
        }),
      }),
    );
  });

  it("prefills and saves an edited warning time", async () => {
    render(<DefaultTimerSettingsPage />);
    // Prefilled from the stored 60s warning.
    expect(
      screen.getByLabelText("Warning at (seconds before end of play)"),
    ).toHaveValue(60);

    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    fireEvent.change(
      screen.getByLabelText("Warning at (seconds before end of play)"),
      { target: { value: "30" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/default-timer",
      expect.objectContaining({
        body: JSON.stringify({
          playSecondsPerBoard: 450,
          moveSeconds: 90,
          warningSeconds: 30,
        }),
      }),
    );
  });

  it("rejects a zero play/changeover without calling the API", () => {
    swrState = {
      data: {
        settings: {
          playSecondsPerBoard: 450,
          moveSeconds: 90,
          timingMode: "perBoard",
          warningSeconds: 60,
        },
      },
      isLoading: false,
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<DefaultTimerSettingsPage />);
    fireEvent.change(screen.getByLabelText("Play minutes"), {
      target: { value: "0" },
    });
    fireEvent.change(screen.getByLabelText("Play seconds"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      screen.getByText("Play and changeover times must be greater than zero"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("clears the admin token and prompts to re-enter it on a 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    render(<DefaultTimerSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        screen.getByText("Session expired. Please re-enter the admin key."),
      ).toBeInTheDocument(),
    );
    expect(mockClearAdminToken).toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("navigates back when the header back arrow is clicked", () => {
    render(<DefaultTimerSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(mockBack).toHaveBeenCalled();
  });
});
