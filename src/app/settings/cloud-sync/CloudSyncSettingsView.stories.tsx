import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { CloudSyncSettingsView } from "@/app/settings/cloud-sync/CloudSyncSettingsView";

const meta: Meta<typeof CloudSyncSettingsView> = {
  title: "App/Settings/CloudSync/CloudSyncSettingsView",
  component: CloudSyncSettingsView,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    status: {
      enabled: true,
      backup: {
        last_success: new Date(Date.now() - 3 * 60_000).toISOString(),
        last_attempt: new Date(Date.now() - 3 * 60_000).toISOString(),
        last_result: "ok",
      },
      logs: { last_success: null, last_attempt: null, last_result: null },
    },
    syncing: false,
    message: null,
    onBackUpNow: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof CloudSyncSettingsView>;

/** Enabled and recently backed up. */
export const BackedUp: Story = {};

/** Enabled but no successful backup yet. */
export const NeverBackedUp: Story = {
  args: {
    status: {
      enabled: true,
      backup: { last_success: null, last_attempt: null, last_result: null },
      logs: { last_success: null, last_attempt: null, last_result: null },
    },
  },
};

/** A backup has been triggered and is in flight (button debounced). */
export const Syncing: Story = {
  args: {
    syncing: true,
    message: "✅ Backup started",
  },
};

/** The last attempt didn't complete — a soft warning is shown. */
export const LastAttemptFailed: Story = {
  args: {
    status: {
      enabled: true,
      backup: {
        last_success: new Date(Date.now() - 2 * 3_600_000).toISOString(),
        last_attempt: new Date(Date.now() - 60_000).toISOString(),
        last_result: "offline",
      },
      logs: { last_success: null, last_attempt: null, last_result: null },
    },
  },
};

/** Cloud backup not enabled on this box (no subscription/config). */
export const NotEnabled: Story = {
  args: {
    status: {
      enabled: false,
      backup: { last_success: null, last_attempt: null, last_result: null },
      logs: { last_success: null, last_attempt: null, last_result: null },
    },
  },
};
