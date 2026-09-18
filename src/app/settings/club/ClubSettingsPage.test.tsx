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
  swrKeys: { club: () => "/api/system/club" },
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

import { ClubSettingsPage } from "./ClubSettingsPage";

const CONFIGURED = { name: "Anytown BC", clubNumber: "12345" };

function fillForm(name: string, number: string) {
  fireEvent.change(screen.getByLabelText("Club Name"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("EBU Club Number"), {
    target: { value: number },
  });
}

describe("ClubSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    swrState = { data: { club: CONFIGURED }, isLoading: false };
    mockGetAdminToken.mockReturnValue("admin-tok");
    mockMutate.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a spinner while the club record loads", () => {
    swrState = { data: undefined, isLoading: true };
    const { container } = render(<ClubSettingsPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("prefills the fields from the fetched club record", () => {
    render(<ClubSettingsPage />);
    expect(screen.getByLabelText("Club Name")).toHaveValue("Anytown BC");
    expect(screen.getByLabelText("EBU Club Number")).toHaveValue("12345");
  });

  it("starts empty when no club is configured", () => {
    swrState = { data: { club: null }, isLoading: false };
    render(<ClubSettingsPage />);
    expect(screen.getByLabelText("Club Name")).toHaveValue("");
    expect(screen.getByLabelText("EBU Club Number")).toHaveValue("");
  });

  it("validates that both fields are required and does not call the API", () => {
    swrState = { data: { club: null }, isLoading: false };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<ClubSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Both fields are required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves with the admin token and revalidates on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClubSettingsPage />);
    fillForm("New Club", "555");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(screen.getByText("✅ Club info saved")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/club",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-admin-token": "admin-tok" }),
        body: JSON.stringify({ name: "New Club", clubNumber: "555" }),
      }),
    );
    expect(mockMutate).toHaveBeenCalled();
  });

  it("clears the admin token and prompts to re-enter it on a 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClubSettingsPage />);
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
      json: async () => ({ error: "Bad club number" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ClubSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Bad club number")).toBeInTheDocument();
  });

  it("shows a network error if the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<ClubSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("navigates back when the header back arrow is clicked", () => {
    render(<ClubSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(mockBack).toHaveBeenCalled();
  });
});
