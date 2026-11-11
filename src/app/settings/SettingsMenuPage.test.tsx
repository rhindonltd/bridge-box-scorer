import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// LogoutButton clears the admin token via logoutAdmin; stub it so rendering the
// menu does not touch real token storage.
vi.mock("@/lib/admin-token", () => ({
  logoutAdmin: vi.fn().mockResolvedValue(undefined),
}));
// LogoutButton navigates home after logging out.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
}));

import { SettingsMenuPage } from "./SettingsMenuPage";

describe("SettingsMenuPage", () => {
  it("links to each settings screen and shows the logout button", () => {
    render(<SettingsMenuPage />);

    expect(screen.getByRole("link", { name: "WiFi Settings" })).toHaveAttribute(
      "href",
      "/settings/wifi",
    );
    expect(screen.getByRole("link", { name: "BridgeWebs" })).toHaveAttribute(
      "href",
      "/settings/bridgewebs",
    );
    // The club's name and EBU number are set on the EBU screen; there is no
    // separate Club Information screen.
    expect(screen.getByRole("link", { name: "EBU" })).toHaveAttribute(
      "href",
      "/settings/ebu",
    );
    expect(
      screen.queryByRole("link", { name: "Club Information" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cloud Backup" })).toHaveAttribute(
      "href",
      "/settings/cloud-sync",
    );
    expect(
      screen.getByRole("link", { name: "Update Admin Key" }),
    ).toHaveAttribute("href", "/settings/admin-key");

    expect(screen.getByRole("button", { name: "Log Out" })).toBeInTheDocument();
  });
});
