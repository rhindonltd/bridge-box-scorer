import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// LogoutButton clears the admin token via logoutAdmin; stub it so rendering the
// menu does not touch real token storage.
vi.mock("@/lib/admin-token", () => ({
  logoutAdmin: vi.fn().mockResolvedValue(undefined),
}));

import { SettingsMenuPage } from "./SettingsMenuPage";

describe("SettingsMenuPage", () => {
  it("links to each settings screen and shows the logout button", () => {
    render(<SettingsMenuPage />);

    expect(screen.getByRole("link", { name: "WiFi Settings" })).toHaveAttribute(
      "href",
      "/settings/wifi",
    );
    expect(
      screen.getByRole("link", { name: "Club Information" }),
    ).toHaveAttribute("href", "/settings/club");
    expect(screen.getByRole("link", { name: "BridgeWebs" })).toHaveAttribute(
      "href",
      "/settings/bridgewebs",
    );
    expect(
      screen.getByRole("link", { name: "Update Admin Key" }),
    ).toHaveAttribute("href", "/settings/admin-key");

    expect(screen.getByRole("button", { name: "Log Out" })).toBeInTheDocument();
  });
});
