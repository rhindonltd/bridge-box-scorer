import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: mockBack }),
}));

const mockGetAdminToken = vi.fn();
vi.mock("@/lib/admin-token", () => ({
  getAdminToken: () => mockGetAdminToken(),
}));

import { UpdateAdminKeyPage } from "./UpdateAdminKeyPage";

function typeNew(value: string) {
  fireEvent.change(screen.getByLabelText("New Admin Key"), {
    target: { value },
  });
}
function typeConfirm(value: string) {
  fireEvent.change(screen.getByLabelText("Confirm Admin Key"), {
    target: { value },
  });
}

describe("UpdateAdminKeyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminToken.mockReturnValue("admin-tok");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("rejects a key shorter than 4 characters without calling the API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<UpdateAdminKeyPage />);
    typeNew("abc");
    typeConfirm("abc");
    fireEvent.click(screen.getByRole("button", { name: "Update Key" }));

    expect(
      screen.getByText("Admin key must be at least 4 characters"),
    ).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects mismatched keys without calling the API", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<UpdateAdminKeyPage />);
    typeNew("abcd");
    typeConfirm("abce");
    fireEvent.click(screen.getByRole("button", { name: "Update Key" }));

    expect(screen.getByText("Keys do not match")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves a valid key with the admin token and clears the fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(<UpdateAdminKeyPage />);
    typeNew("newsecret");
    typeConfirm("newsecret");
    fireEvent.click(screen.getByRole("button", { name: "Update Key" }));

    await waitFor(() =>
      expect(screen.getByText("✅ Admin key updated")).toBeInTheDocument(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/system/admin-key",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-admin-token": "admin-tok" }),
        body: JSON.stringify({ key: "newsecret" }),
      }),
    );
    // Fields cleared after success.
    expect(screen.getByLabelText("New Admin Key")).toHaveValue("");
    expect(screen.getByLabelText("Confirm Admin Key")).toHaveValue("");
  });

  it("shows the server error message on failure", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Key rejected" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<UpdateAdminKeyPage />);
    typeNew("newsecret");
    typeConfirm("newsecret");
    fireEvent.click(screen.getByRole("button", { name: "Update Key" }));

    expect(await screen.findByText("Key rejected")).toBeInTheDocument();
  });

  it("shows a network error if the request throws", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetchMock);

    render(<UpdateAdminKeyPage />);
    typeNew("newsecret");
    typeConfirm("newsecret");
    fireEvent.click(screen.getByRole("button", { name: "Update Key" }));

    expect(await screen.findByText("Network error")).toBeInTheDocument();
  });

  it("navigates back when the header back arrow is clicked", () => {
    render(<UpdateAdminKeyPage />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(mockBack).toHaveBeenCalled();
  });
});
