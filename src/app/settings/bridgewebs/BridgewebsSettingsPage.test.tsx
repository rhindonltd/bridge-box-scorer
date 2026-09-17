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
  swrKeys: { bridgewebs: () => "/api/system/bridgewebs" },
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

import { BridgewebsSettingsPage } from "./BridgewebsSettingsPage";

function typeClub(value: string) {
  fireEvent.change(screen.getByLabelText("BridgeWebs Club Code"), {
    target: { value },
  });
}
function typePassword(value: string) {
  fireEvent.change(screen.getByLabelText("BridgeWebs Password"), {
    target: { value },
  });
}

describe("BridgewebsSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState = {
      data: { configured: true, club: "anytownbc" },
      isLoading: false,
    };
    mockGetAdminToken.mockReturnValue("admin-tok");
    mockMutate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a spinner while the status loads", () => {
    swrState = { data: undefined, isLoading: true };
    const { container } = render(<BridgewebsSettingsPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("prefills the club code and shows the password-saved hint when configured", () => {
    render(<BridgewebsSettingsPage />);
    expect(screen.getByLabelText("BridgeWebs Club Code")).toHaveValue(
      "anytownbc",
    );
    expect(screen.getByText(/A password is saved/i)).toBeInTheDocument();
  });

  it("requires a club code", () => {
    swrState = { data: { configured: false, club: null }, isLoading: false };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<BridgewebsSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Club code is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires a password on first configuration", () => {
    swrState = { data: { configured: false, club: null }, isLoading: false };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<BridgewebsSettingsPage />);
    typeClub("newclub");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Password is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows a blank password when already configured (keeps the stored one)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<BridgewebsSettingsPage />);
    // configured=true, club prefilled, password left blank.
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        screen.getByText("✅ BridgeWebs settings saved"),
      ).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/bridgewebs",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-admin-token": "admin-tok" }),
        body: JSON.stringify({ club: "anytownbc", password: "" }),
      }),
    );
    expect(mockMutate).toHaveBeenCalled();
  });

  it("clears the admin token and prompts to re-enter it on a 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    render(<BridgewebsSettingsPage />);
    typePassword("secret");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(
        screen.getByText("Session expired. Please re-enter the admin key."),
      ).toBeInTheDocument(),
    );
    expect(mockClearAdminToken).toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows the server error message on a non-401 failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid club code" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<BridgewebsSettingsPage />);
    typePassword("secret");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Invalid club code")).toBeInTheDocument();
  });

  it("shows a network error if the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<BridgewebsSettingsPage />);
    typePassword("secret");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("navigates back when Back is clicked", () => {
    render(<BridgewebsSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(mockBack).toHaveBeenCalled();
  });
});
