import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockLogoutAdmin = vi.fn();
vi.mock("@/lib/admin-token", () => ({
  logoutAdmin: () => mockLogoutAdmin(),
}));

import { LogoutButton } from "./LogoutButton";

describe("LogoutButton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the log out action", () => {
    render(<LogoutButton />);
    expect(screen.getByRole("button", { name: "Log Out" })).toBeInTheDocument();
  });

  it("calls logoutAdmin when clicked", async () => {
    mockLogoutAdmin.mockResolvedValue(undefined);
    render(<LogoutButton />);

    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));

    await waitFor(() => expect(mockLogoutAdmin).toHaveBeenCalledTimes(1));
  });

  it("shows a logging-out state while the logout is in flight, then re-enables", async () => {
    let resolveLogout: () => void = () => {};
    mockLogoutAdmin.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveLogout = resolve;
      }),
    );

    render(<LogoutButton />);
    fireEvent.click(screen.getByRole("button", { name: "Log Out" }));

    // Mid-flight: button shows the loading label and is disabled.
    const loading = await screen.findByRole("button", { name: "Logging out…" });
    expect(loading).toBeDisabled();

    // Resolve the logout: button returns to its default enabled state.
    resolveLogout();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Log Out" }),
      ).not.toBeDisabled(),
    );
  });
});
