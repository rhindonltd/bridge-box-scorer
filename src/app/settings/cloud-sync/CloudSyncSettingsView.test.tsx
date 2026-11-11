import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CloudSyncSettingsView, relativeTime } from "./CloudSyncSettingsView";
import type { CloudSyncStatus } from "@/lib/system/cloud-sync";

function status(overrides: Partial<CloudSyncStatus> = {}): CloudSyncStatus {
  return {
    enabled: true,
    backup: { last_success: null, last_attempt: null, last_result: null },
    logs: { last_success: null, last_attempt: null, last_result: null },
    ...overrides,
  };
}

describe("relativeTime", () => {
  const now = Date.parse("2026-09-28T15:00:00Z");

  it("returns null for a null timestamp", () => {
    expect(relativeTime(null, now)).toBeNull();
  });

  it("returns null for an unparseable timestamp", () => {
    expect(relativeTime("not-a-date", now)).toBeNull();
  });

  it("formats recent minutes and hours", () => {
    expect(relativeTime("2026-09-28T14:57:00Z", now)).toBe("3 minutes ago");
    expect(relativeTime("2026-09-28T14:59:30Z", now)).toBe("30 seconds ago");
    expect(relativeTime("2026-09-28T13:00:00Z", now)).toBe("2 hours ago");
  });

  it("reports 'just now' for a very recent timestamp", () => {
    expect(relativeTime("2026-09-28T14:59:58Z", now)).toBe("just now");
  });
  it("formats hours singular and days", () => {
    expect(relativeTime("2026-09-28T14:00:00Z", now)).toBe("1 hour ago");
    expect(relativeTime("2026-09-27T15:00:00Z", now)).toBe("1 day ago");
    expect(relativeTime("2026-09-25T15:00:00Z", now)).toBe("3 days ago");
  });
  it("defaults 'now' to the current time", () => {
    expect(relativeTime(new Date().toISOString())).toBe("just now");
  });
  it("singularises a one-unit interval", () => {
    expect(relativeTime("2026-09-28T14:59:00Z", now)).toBe("1 minute ago");
  });
});

describe("CloudSyncSettingsView", () => {
  it("shows 'not enabled' copy and no button when the feature is off", () => {
    render(
      <CloudSyncSettingsView
        status={status({ enabled: false })}
        syncing={false}
        message={null}
        onBackUpNow={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/not enabled/i)).toBeInTheDocument();
    // A bold headline, like the WiFi "can't be changed on this device" screen.
    expect(
      screen.getByRole("heading", {
        name: "Cloud backup is not enabled on this box",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Game data is kept locally/)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /back up now/i }),
    ).not.toBeInTheDocument();
  });

  it("shows 'Not yet' when enabled but never backed up", () => {
    render(
      <CloudSyncSettingsView
        status={status()}
        syncing={false}
        message={null}
        onBackUpNow={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText("Not yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back up now/i }),
    ).toBeInTheDocument();
  });

  it("surfaces a warning when the last backup didn't complete", () => {
    render(
      <CloudSyncSettingsView
        status={status({
          backup: {
            last_success: "2026-09-28T14:00:00Z",
            last_attempt: "2026-09-28T14:30:00Z",
            last_result: "error",
          },
        })}
        syncing={false}
        message={null}
        onBackUpNow={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText(/didn't complete/i)).toBeInTheDocument();
  });

  it("fires onBackUpNow when the button is pressed", () => {
    const onBackUpNow = vi.fn();
    render(
      <CloudSyncSettingsView
        status={status()}
        syncing={false}
        message={null}
        onBackUpNow={onBackUpNow}
        onBack={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /back up now/i }));
    expect(onBackUpNow).toHaveBeenCalledOnce();
  });

  it("disables the button while syncing", () => {
    render(
      <CloudSyncSettingsView
        status={status()}
        syncing={true}
        message={null}
        onBackUpNow={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /backing up/i })).toBeDisabled();
  });
  const renderWith = (st: CloudSyncStatus, message: string | null = null) =>
    render(
      <CloudSyncSettingsView
        status={st}
        syncing={false}
        message={message}
        onBackUpNow={vi.fn()}
        onBack={vi.fn()}
      />,
    );
  const withResult = (last_result: any) =>
    status({
      backup: {
        last_success: "2026-09-28T14:00:00Z",
        last_attempt: "2026-09-28T14:30:00Z",
        last_result,
      },
    });
  it("warns when the box was offline", () => {
    renderWith(withResult("offline"));
    expect(screen.getByText(/box was offline/i)).toBeInTheDocument();
  });
  it("warns when the subscription does not include backup", () => {
    renderWith(withResult("not_entitled"));
    expect(screen.getByText(/isn't included/i)).toBeInTheDocument();
  });
  it("shows no warning for a successful backup", () => {
    renderWith(withResult("ok"));
    expect(screen.queryByText(/didn't complete/i)).not.toBeInTheDocument();
  });
  it("does not warn when the feature is disabled even if the last run failed", () => {
    renderWith({ ...withResult("error"), enabled: false });
    expect(screen.queryByText(/didn't complete/i)).not.toBeInTheDocument();
  });
  it("renders a success message and an error message", () => {
    const { unmount } = renderWith(status(), "✅ Backup started");
    expect(screen.getByText("✅ Backup started")).toHaveClass("text-green-700");
    unmount();
    renderWith(status(), "Network error");
    expect(screen.getByText("Network error")).toHaveClass("text-red-600");
  });
  it("calls onBack from the header back arrow", () => {
    const onBack = vi.fn();
    render(
      <CloudSyncSettingsView
        status={status()}
        syncing={false}
        message={null}
        onBackUpNow={vi.fn()}
        onBack={onBack}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(onBack).toHaveBeenCalled();
  });
});
