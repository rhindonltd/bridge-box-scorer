import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockLogoutAdmin = vi.fn();
vi.mock("@/lib/admin-token", () => ({
  logoutAdmin: () => mockLogoutAdmin(),
}));

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import { LogoutButton } from "./LogoutButton";

describe("LogoutButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the log out action", () => {
    render(<LogoutButton />);
    expect(screen.getByRole("button", { name: "Log Out" })).toBeInTheDocument();
  });

  it("logs out and returns to the home screen", async () => {
    mockLogoutAdmin.mockResolvedValue(undefined);
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
    expect(mockLogoutAdmin).toHaveBeenCalledTimes(1);
  });

  it("shows a logging-out state while the logout is in flight", async () => {
    let resolveLogout: () => void = () => {};
    mockLogoutAdmin.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogout = resolve;
      }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));

    // Mid-flight: button shows the loading label and is disabled, and we have
    // not navigated yet.
    const loading = await screen.findByRole("button", { name: "Logging out…" });
    expect(loading).toBeDisabled();
    expect(mockReplace).not.toHaveBeenCalled();

    resolveLogout();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/"));
  });

  it("re-enables the button and stays put if the logout fails", async () => {
    mockLogoutAdmin.mockRejectedValue(new Error("boom"));
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Log Out" }),
      ).not.toBeDisabled(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
