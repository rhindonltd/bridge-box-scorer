import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// The page reads two SWR keys: the EBU login status and the club record.
type SwrState = { data: unknown; isLoading: boolean };
let ebuState: SwrState;
let clubState: SwrState;
const mockMutateEbu = vi.fn();
const mockMutateClub = vi.fn();

vi.mock("swr", () => ({
  default: (key: string) =>
    key === "/api/system/club"
      ? { ...clubState, mutate: mockMutateClub }
      : { ...ebuState, mutate: mockMutateEbu },
}));

vi.mock("@/lib/fetcher", () => ({ fetcher: vi.fn() }));

vi.mock("@/swr/swr-keys", () => ({
  swrKeys: { ebu: () => "/api/system/ebu", club: () => "/api/system/club" },
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

import { EbuSettingsPage } from "./EbuSettingsPage";

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
function typePassword(value: string) {
  type("EBU Password", value);
}
function save() {
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
}

describe("EbuSettingsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ebuState = {
      data: { configured: true, ebuNumber: "1234567" },
      isLoading: false,
    };
    clubState = {
      data: { club: { id: 1, name: "Anytown BC", clubNumber: "1234567" } },
      isLoading: false,
    };
    mockGetAdminToken.mockReturnValue("admin-tok");
    mockMutateEbu.mockResolvedValue(undefined);
    mockMutateClub.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows a spinner while the EBU status loads", () => {
    ebuState = { data: undefined, isLoading: true };
    const { container } = render(<EbuSettingsPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("shows a spinner while the club record loads", () => {
    clubState = { data: undefined, isLoading: true };
    const { container } = render(<EbuSettingsPage />);
    expect(container.querySelector(".animate-spin")).toBeTruthy();
  });

  it("prefills the club name and EBU number and shows the password-saved hint", () => {
    render(<EbuSettingsPage />);
    expect(screen.getByLabelText("Club Name")).toHaveValue("Anytown BC");
    expect(screen.getByLabelText("EBU Club Number")).toHaveValue("1234567");
    expect(screen.getByText(/A password is saved/i)).toBeInTheDocument();
  });

  it("falls back to the club record's number when no EBU login is stored", () => {
    // A device that only had its club details set up before the screens merged.
    ebuState = {
      data: { configured: false, ebuNumber: null },
      isLoading: false,
    };
    clubState = {
      data: { club: { id: 1, name: "Anytown BC", clubNumber: "555" } },
      isLoading: false,
    };
    render(<EbuSettingsPage />);
    expect(screen.getByLabelText("EBU Club Number")).toHaveValue("555");
  });

  it("requires a club name", () => {
    clubState = { data: { club: null }, isLoading: false };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    save();

    expect(screen.getByText("Club name is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("requires an EBU number", () => {
    ebuState = {
      data: { configured: false, ebuNumber: null },
      isLoading: false,
    };
    clubState = { data: { club: null }, isLoading: false };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    type("Club Name", "Anytown BC");
    save();

    expect(screen.getByText("EBU number is required")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves the club details without a password on first setup (password is optional)", async () => {
    ebuState = {
      data: { configured: false, ebuNumber: null },
      isLoading: false,
    };
    clubState = { data: { club: null }, isLoading: false };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    type("Club Name", " Anytown BC ");
    type("EBU Club Number", " 7654321 ");
    save();

    await waitFor(() =>
      expect(screen.getByText("✅ EBU settings saved")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/ebu",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-admin-token": "admin-tok" }),
        body: JSON.stringify({
          clubName: "Anytown BC",
          ebuNumber: "7654321",
          password: "",
        }),
      }),
    );
    // Both shared caches refresh so the export screens see the new club.
    expect(mockMutateEbu).toHaveBeenCalled();
    expect(mockMutateClub).toHaveBeenCalled();
  });

  it("sends a typed password and clears it after saving", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    typePassword("secret");
    save();

    await waitFor(() =>
      expect(screen.getByText("✅ EBU settings saved")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/ebu",
      expect.objectContaining({
        body: JSON.stringify({
          clubName: "Anytown BC",
          ebuNumber: "1234567",
          password: "secret",
        }),
      }),
    );
    expect(screen.getByLabelText("EBU Password")).toHaveValue("");
  });

  it("clears the admin token and prompts to re-enter it on a 401", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    typePassword("secret");
    save();

    await waitFor(() =>
      expect(
        screen.getByText("Session expired. Please re-enter the admin key."),
      ).toBeInTheDocument(),
    );
    expect(mockClearAdminToken).toHaveBeenCalled();
    expect(mockMutateEbu).not.toHaveBeenCalled();
    expect(mockMutateClub).not.toHaveBeenCalled();
  });

  it("shows the server error message on a non-401 failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid number" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    save();

    expect(await screen.findByText("Invalid number")).toBeInTheDocument();
  });

  it("shows a network error if the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    save();

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("sends an empty token header when no admin token is stored", async () => {
    // No stored token exercises the `getAdminToken() ?? ""` fallback arm.
    mockGetAdminToken.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    save();

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/ebu",
      expect.objectContaining({
        headers: expect.objectContaining({ "x-admin-token": "" }),
      }),
    );
  });

  it("falls back to a generic message when the error body cannot be parsed", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not json");
      },
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<EbuSettingsPage />);
    save();

    expect(await screen.findByText("Failed to save")).toBeInTheDocument();
  });

  it("navigates back when the header back arrow is clicked", () => {
    render(<EbuSettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(mockBack).toHaveBeenCalled();
  });
});
