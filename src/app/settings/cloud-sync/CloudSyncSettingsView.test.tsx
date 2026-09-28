import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  CloudSyncSettingsView,
  relativeTime,
} from "./CloudSyncSettingsView";
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

    expect(
      screen.getByRole("button", { name: /backing up/i }),
    ).toBeDisabled();
  });
});
