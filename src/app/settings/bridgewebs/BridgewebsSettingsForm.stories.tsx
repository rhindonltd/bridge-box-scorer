import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { BridgewebsSettingsForm } from "@/app/settings/bridgewebs/BridgewebsSettingsForm";

const meta: Meta<typeof BridgewebsSettingsForm> = {
  title: "App/Settings/Bridgewebs/BridgewebsSettingsForm",
  component: BridgewebsSettingsForm,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
  args: {
    club: "",
    password: "",
    configured: false,
    saving: false,
    message: null,
    onClubChange: fn(),
    onPasswordChange: fn(),
    onSave: fn(),
    onBack: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof BridgewebsSettingsForm>;

/** First-time setup: nothing configured, password required. */
export const Unconfigured: Story = {};

/**
 * Already configured: the club code is prefilled and the password may be left
 * blank to keep the stored one (note the hint under the password field).
 */
export const Configured: Story = {
  args: {
    club: "anytownbc",
    configured: true,
  },
};

/** A save is in flight. */
export const Saving: Story = {
  args: {
    club: "anytownbc",
    configured: true,
    saving: true,
  },
};

/** Successful save confirmation. */
export const Saved: Story = {
  args: {
    club: "anytownbc",
    configured: true,
    message: "✅ BridgeWebs settings saved",
  },
};

/** Validation / server error. */
export const Error: Story = {
  args: {
    club: "",
    message: "Club code is required",
  },
};
