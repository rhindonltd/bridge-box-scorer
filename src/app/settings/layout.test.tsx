import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const { verifyAdminTokenWithServer, subscribeAdminToken } = vi.hoisted(() => ({
  verifyAdminTokenWithServer: vi.fn(),
  subscribeAdminToken: vi.fn(() => () => {}),
}));
vi.mock("@/lib/admin-token", () => ({
  verifyAdminTokenWithServer,
  subscribeAdminToken,
}));

// Stub the PIN entry so we can assert when the prompt (vs the content) shows.
vi.mock("@/app/settings/AdminKeyEntry", () => ({
  AdminKeyEntry: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      admin-key-entry
    </button>
  ),
}));

import SettingsLayout from "./layout";

describe("SettingsLayout auth gate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders the protected content only after the server confirms the token", async () => {
    verifyAdminTokenWithServer.mockResolvedValue(true);

    render(
      <SettingsLayout>
        <div>protected-content</div>
      </SettingsLayout>,
    );

    // Nothing (neither content nor prompt) until the check resolves.
    expect(screen.queryByText("protected-content")).toBeNull();
    expect(screen.queryByText("admin-key-entry")).toBeNull();

    await waitFor(() =>
      expect(screen.getByText("protected-content")).toBeInTheDocument(),
    );
    expect(screen.queryByText("admin-key-entry")).toBeNull();
  });

  it("shows the admin-key prompt (not the content) when the token is invalid", async () => {
    verifyAdminTokenWithServer.mockResolvedValue(false);

    render(
      <SettingsLayout>
        <div>protected-content</div>
      </SettingsLayout>,
    );

    await waitFor(() =>
      expect(screen.getByText("admin-key-entry")).toBeInTheDocument(),
    );
    // Critically: the protected content must never render for an invalid token.
    expect(screen.queryByText("protected-content")).toBeNull();
  });

  it("re-validates against the server (does not trust the client) after a successful key entry", async () => {
    // First check fails (no/instale token), then succeeds after entry.
    verifyAdminTokenWithServer
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    render(
      <SettingsLayout>
        <div>protected-content</div>
      </SettingsLayout>,
    );

    const entry = await screen.findByText("admin-key-entry");
    entry.click();

    await waitFor(() =>
      expect(screen.getByText("protected-content")).toBeInTheDocument(),
    );
    expect(verifyAdminTokenWithServer).toHaveBeenCalledTimes(2);
  });
});
